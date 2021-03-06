/* eslint no-underscore-dangle: 0 */
import isEqual from 'lodash.isequal';
import * as THREE from 'three';
import CoordinateTranslator from './coordinate-translator';

const _createMesh = props => {
  const { width, height, imgUrl } = props;
  const img = new THREE.MeshBasicMaterial({
    map: new THREE.TextureLoader().load(imgUrl),
    side: THREE.DoubleSide,
    transparent: true,
    polygonOffset: true,
    polygonOffsetFactor: 1, // positive value pushes polygon further away
    polygonOffsetUnits: 1,
    alphaTest: 0.5,
  });
  // img.map.needsUpdate = true;
  img.map.minFilter = THREE.LinearFilter;

  const geometry = new THREE.PlaneGeometry(width, height);
  const material = img;
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
};

const _createOverLayMesh = props => {
  const { width, height } = props;
  const geometry = new THREE.PlaneGeometry(width, height);
  const material = new THREE.MeshBasicMaterial({
    color: 0x00bfff,
    side: THREE.DoubleSide,
    opacity: 0.35,
    transparent: true,
  });
  const overlayMesh = new THREE.Mesh(geometry, material);
  return overlayMesh;
};

const _createLineSegments = props => {
  const { width, height, selected, onFocus } = props;

  let wireframeColor = 0x666666;
  if (selected) {
    wireframeColor = 0x2566c6;
  } else if (onFocus) {
    wireframeColor = 0xcccccc;
  }

  const geometry = new THREE.PlaneGeometry(width, height);
  const wGeometry = new THREE.EdgesGeometry(geometry);
  const wMaterial = new THREE.LineBasicMaterial({
    color: wireframeColor,
    linewidth: 1,
  });

  const lineSegments = new THREE.LineSegments(wGeometry, wMaterial);
  return lineSegments;
};

const _updateView = (group, viewProps, nextViewProps) => {
  const { width, height, selected, onFocus, imgUrl, revision } = nextViewProps;
  /* eslint-disable no-param-reassign */
  group.children.forEach(el => {
    if (viewProps.width) {
      el.scale.x *= width / viewProps.width;
    } else {
      el.scale.x += width;
    }

    if (viewProps.height) {
      el.scale.y *= height / viewProps.height;
    } else {
      el.scale.y += height;
    }
  });

  if (imgUrl !== viewProps.imgUrl || revision !== viewProps.revision) {
    group.children[0].material.map = new THREE.TextureLoader().load(imgUrl);
  }
  /* eslint-enable no-param-reassign */

  let wireframeColor = 0x666666;
  if (selected) {
    wireframeColor = 0x2566c6;
  } else if (onFocus) {
    wireframeColor = 0xcccccc;
  }
  group.children[1].material.color.setHex(wireframeColor);

  if (selected) {
    if (group.children.length < 3) {
      const overlayMesh = _createOverLayMesh(nextViewProps);
      group.add(overlayMesh);
    }
  } else if (group.children.length === 3) {
    group.remove(group.children[2]);
  }
};

const _isVisible = props => {
  const { height, width, isHidden } = props;
  return height > 0 && width > 0 && !isHidden;
};

const _getMeshGroup = nodeGroup => {
  const {
    children: [meshGroup],
  } = nodeGroup;
  return meshGroup;
};

class SceneManager {
  constructor(scene, planeOffset) {
    this.scene = scene;
    this.planeOffset = planeOffset;
    this.viewsMap = {};
    this.constraintIndicatorsMap = {};
    this.showTexture = true;
  }

  getMeshGroups() {
    return Object.values(this.viewsMap).map(_getMeshGroup);
  }

  flipTextureVisibility() {
    this.showTexture = !this.showTexture;
    Object.values(this.viewsMap).forEach(nodeGroup => {
      const [meshGroup] = nodeGroup.children;
      const [textureMesh] = meshGroup.children;
      // eslint-disable-next-line no-param-reassign
      textureMesh.visible = this.showTexture;
    });
  }

  updatePlaneOffset(planeOffset) {
    this.planeOffset = planeOffset;
    Object.values(this.viewsMap).forEach(nodeGroup => {
      const {
        userData: { z },
      } = nodeGroup;
      nodeGroup.position.setZ(z * this.planeOffset);
    });
    Object.values(this.constraintIndicatorsMap).forEach(
      ({ lineGroup: { children }, indicatorProps }) =>
        indicatorProps.lines.forEach(({ p1, p2 }, idx) => {
          const line = children[idx];
          line.geometry.vertices[0].z = p1.z * this.planeOffset + 1;
          line.geometry.vertices[1].z = p2.z * this.planeOffset + 1;
          line.geometry.verticesNeedUpdate = true;
        }),
    );
  }

  updateConstraintIndicators(indicators) {
    const findNodeGroup = id => this.viewsMap[id.split('.')[0]];
    Object.entries(this.constraintIndicatorsMap).forEach(([key, value]) => {
      const { lineGroup } = value;
      const nodeGroup = findNodeGroup(key);
      nodeGroup.remove(lineGroup);
      delete this.constraintIndicatorsMap[key];
    });

    indicators.forEach(nextIndicatorProps => {
      const nodeGroup = findNodeGroup(nextIndicatorProps.id);
      const lines = nextIndicatorProps.lines.map(({ p1, p2 }) => ({
        p1: CoordinateTranslator.calcScenePoint(p1, nodeGroup),
        p2: CoordinateTranslator.calcScenePoint(p2, nodeGroup),
      }));
      const lineGroup = this._createConstraintIndicator(lines);
      this.constraintIndicatorsMap[nextIndicatorProps.id] = {
        lineGroup,
        indicatorProps: nextIndicatorProps,
      };
      nodeGroup.add(lineGroup);
    });
  }

  updateViews(treeNode) {
    this._updateViews(treeNode, this.scene);
  }

  _updateViews(treeNode, parentObject) {
    if (treeNode) {
      const { children: subtrees, ...nextViewProps } = treeNode;
      if (treeNode.id in this.viewsMap) {
        const nodeGroup = this.viewsMap[treeNode.id];
        const { userData: viewProps } = nodeGroup;
        if (!isEqual(viewProps, nextViewProps)) {
          this._updateViewNode(nodeGroup, viewProps, nextViewProps);
          this._translateObject(nodeGroup);
          this.viewsMap[nextViewProps.id].viewProps = nextViewProps;
        }
        subtrees.forEach(childTreeNode =>
          this._updateViews(childTreeNode, nodeGroup),
        );
      } else {
        const nodeGroup = this._createViewNode(nextViewProps);
        parentObject.add(nodeGroup);
        this._translateObject(nodeGroup);
        this.viewsMap[nextViewProps.id] = nodeGroup;
        subtrees.forEach(childTreeNode =>
          this._updateViews(childTreeNode, nodeGroup),
        );
      }
    }
  }

  _translateObject(obj) {
    if (obj.parent !== this.scene) {
      obj.position.copy(CoordinateTranslator.calcSceneRect(obj));
    }
  }

  _createViewNode(viewProps) {
    const { x, y, z } = viewProps;
    const nodeGroup = new THREE.Group();
    nodeGroup.userData = viewProps;

    const meshGroup = this._createView(viewProps);
    nodeGroup.add(meshGroup);

    nodeGroup.position.set(x, y, z * this.planeOffset);
    nodeGroup.visible = _isVisible(viewProps);
    return nodeGroup;
  }

  _createView(viewProps) {
    const { selected } = viewProps;
    const meshGroup = new THREE.Group();

    const mesh = _createMesh(viewProps);
    mesh.visible = this.showTexture;
    meshGroup.add(mesh);

    const lineSegments = _createLineSegments(viewProps);
    meshGroup.add(lineSegments);

    if (selected) {
      const overlayMesh = _createOverLayMesh(viewProps);
      meshGroup.add(overlayMesh);
    }

    return meshGroup;
  }

  _updateViewNode(nodeGroup, viewProps, nextViewProps) {
    const { x, y, z } = nextViewProps;
    nodeGroup.position.set(x, y, z * this.planeOffset);
    /* eslint-disable no-param-reassign */
    nodeGroup.visible = _isVisible(nextViewProps);
    nodeGroup.userData = nextViewProps;
    /* eslint-enable no-param-reassign */
    const [meshGroup] = nodeGroup.children;
    _updateView(meshGroup, viewProps, nextViewProps);
  }

  _createConstraintIndicator(constraintIndicatorProps) {
    const lineGroup = new THREE.Group();
    constraintIndicatorProps.forEach(indicator =>
      lineGroup.add(this._createLine(indicator)),
    );
    return lineGroup;
  }

  _createLine(props) {
    const {
      p1: { x: x1, y: y1, z: z1 },
      p2: { x: x2, y: y2, z: z2 },
    } = props;

    const p1 = new THREE.Vector3(x1, y1, z1 * this.planeOffset + 1);
    const p2 = new THREE.Vector3(x2, y2, z2 * this.planeOffset + 1);

    const matertial = new THREE.LineBasicMaterial({
      color: 0xc89637,
      linewidth: 2,
    });
    const geometry = new THREE.Geometry();
    geometry.vertices.push(p1);
    geometry.vertices.push(p2);

    return new THREE.Line(geometry, matertial);
  }
}

export default SceneManager;

// 測試共用：不開 WebGL，把一關「立在場地上的東西」照 createGameScene 的組法組出來
// （原型關是路緣＋停車場擺設，其餘是環境模組；再加關卡的障礙物與邊界），並提供打視線用的實心網格。
// 地面、天空、車位標線、特效不在裡面：它們擋不住鏡頭。
import { Group, Mesh, type Material, type Object3D } from 'three';
import { DEFAULT_SEED } from '../src/core/gameConfig';
import type { LevelDefinition } from '../src/level/levelSchema';
import { createEnvironmentLayout } from '../src/props/environmentLayout';
import { createEnvironment } from '../src/props/environments';
import { createCurbs, createWheelStop } from '../src/props/lotEdges';
import { createLotLayout } from '../src/props/lotLayout';
import { createLotProps } from '../src/props/lotProps';
import { createObstacleMeshes } from '../src/props/obstacleMeshes';
import { usesHdrChain, type QualitySettings } from '../src/render/quality';

/** 這一關的擺設、環境、障礙物與邊界（世界矩陣已更新）。 */
export function buildLevelWorld(level: LevelDefinition, quality: QualitySettings): Group {
  const world = new Group();
  const { spot, startState } = level.layout;
  const environment = createEnvironmentLayout(level, quality.props);
  if (environment === undefined) {
    world.add(createCurbs(spot), createWheelStop(spot));
    world.add(
      createLotProps(
        spot,
        createLotLayout(spot, startState, DEFAULT_SEED, quality.props),
        quality.props,
        usesHdrChain(quality),
      ),
    );
  } else {
    world.add(createEnvironment(spot, environment, quality.props, usesHdrChain(quality)));
  }
  world.add(createObstacleMeshes(level, quality.props.meshDetail));
  world.updateMatrixWorld(true);
  return world;
}

function firstMaterial(mesh: Mesh): Material | undefined {
  return Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
}

/**
 * root 底下看不穿的網格：不透明、會寫深度的。光錐、光暈、玻璃這些半透明的東西不算擋住視線。
 */
export function solidMeshes(root: Object3D): Mesh[] {
  const meshes: Mesh[] = [];
  root.traverse((object) => {
    if (object instanceof Mesh) {
      const material = firstMaterial(object);
      if (material !== undefined && !material.transparent && material.depthWrite) {
        meshes.push(object);
      }
    }
  });
  return meshes;
}

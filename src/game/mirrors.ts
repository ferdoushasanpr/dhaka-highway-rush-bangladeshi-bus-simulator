/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { VehicleMeshObject } from './models';

export class MirrorManager {
  private rearCamera: THREE.PerspectiveCamera;
  private renderTarget: THREE.WebGLRenderTarget;
  private mirrorMaterial: THREE.MeshBasicMaterial;
  private isEnabled: boolean = true;
  private frameCounter: number = 0;

  constructor() {
    this.rearCamera = new THREE.PerspectiveCamera(55, 1.0, 0.5, 250);
    // 256x256 render target is optimal for real-time mirrors with zero frame drops
    this.renderTarget = new THREE.WebGLRenderTarget(256, 256, {
      format: THREE.RGBAFormat,
      generateMipmaps: false,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });

    this.mirrorMaterial = new THREE.MeshBasicMaterial({
      map: this.renderTarget.texture,
      side: THREE.DoubleSide,
    });
  }

  /**
   * Bind the real-time rear texture to the bus mirror surfaces
   */
  public attachToBus(busMesh: VehicleMeshObject) {
    if (busMesh.leftMirrorMesh) {
      busMesh.leftMirrorMesh.material = this.mirrorMaterial;
    }
    if (busMesh.rightMirrorMesh) {
      busMesh.rightMirrorMesh.material = this.mirrorMaterial;
    }
    if (busMesh.centerMirrorMesh) {
      busMesh.centerMirrorMesh.material = this.mirrorMaterial;
    }
  }

  /**
   * Get the mirror texture (can also be displayed in a HUD PIP box!)
   */
  public getMirrorTexture(): THREE.Texture {
    return this.renderTarget.texture;
  }

  /**
   * Render the rear perspective into the mirror texture.
   * Mirrors look backward along the highway (-Z from bus direction).
   */
  public renderMirror(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    busMesh: VehicleMeshObject,
    isCockpitView: boolean,
    isSoftwareGl: boolean
  ) {
    // In software WebGL, render every 2nd or 3rd frame to conserve CPU
    this.frameCounter++;
    if (isSoftwareGl && this.frameCounter % 2 !== 0) {
      return;
    }

    // Position rear camera at the rear roof edge of the bus, looking backward down the highway
    const busPos = busMesh.position;
    // Bus length is 11.5m, so rear is at busPos.z - 5.75m. Position camera just at the rear glass
    this.rearCamera.position.set(busPos.x, busPos.y + 2.8, busPos.z - 5.9);
    // Look backward (-Z is rearward)
    this.rearCamera.lookAt(busPos.x, busPos.y + 1.8, busPos.z - 120);

    const currentRenderTarget = renderer.getRenderTarget();
    renderer.setRenderTarget(this.renderTarget);
    renderer.render(scene, this.rearCamera);
    renderer.setRenderTarget(currentRenderTarget);
  }

  public dispose() {
    this.renderTarget.dispose();
    this.mirrorMaterial.dispose();
  }
}

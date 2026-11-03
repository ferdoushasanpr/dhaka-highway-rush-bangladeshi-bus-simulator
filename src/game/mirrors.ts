/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { VehicleMeshObject } from './models';

export class MirrorManager {
  private leftCamera: THREE.PerspectiveCamera;
  private rightCamera: THREE.PerspectiveCamera;
  private centerCamera: THREE.PerspectiveCamera;

  private leftRenderTarget: THREE.WebGLRenderTarget;
  private rightRenderTarget: THREE.WebGLRenderTarget;
  private centerRenderTarget: THREE.WebGLRenderTarget;

  private leftMirrorMaterial: THREE.MeshBasicMaterial;
  private rightMirrorMaterial: THREE.MeshBasicMaterial;
  private centerMirrorMaterial: THREE.MeshBasicMaterial;

  private frameCounter: number = 0;

  constructor() {
    // 1. Setup individual perspective cameras with wide FOV
    this.leftCamera = new THREE.PerspectiveCamera(65, 0.5, 0.4, 260);
    this.rightCamera = new THREE.PerspectiveCamera(65, 0.5, 0.4, 260);
    this.centerCamera = new THREE.PerspectiveCamera(65, 2.4, 0.4, 260);

    // 2. Setup Render Targets
    const targetOptions = {
      format: THREE.RGBAFormat,
      generateMipmaps: false,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    };

    this.leftRenderTarget = new THREE.WebGLRenderTarget(256, 256, targetOptions);
    this.rightRenderTarget = new THREE.WebGLRenderTarget(256, 256, targetOptions);
    this.centerRenderTarget = new THREE.WebGLRenderTarget(512, 256, targetOptions);

    // CRITICAL FIX: Optical Mirror Inversion
    // In optical reflection, looking rearwards, an object to the driver's left (+X)
    // must appear on the left side of the mirror surface.
    // By setting repeat.x = -1 and offset.x = 1, texture coordinates are horizontally inverted.
    [this.leftRenderTarget.texture, this.rightRenderTarget.texture, this.centerRenderTarget.texture].forEach(
      (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.repeat.x = -1;
        texture.offset.x = 1;
      }
    );

    // 3. Materials
    this.leftMirrorMaterial = new THREE.MeshBasicMaterial({
      map: this.leftRenderTarget.texture,
      side: THREE.DoubleSide,
    });
    this.rightMirrorMaterial = new THREE.MeshBasicMaterial({
      map: this.rightRenderTarget.texture,
      side: THREE.DoubleSide,
    });
    this.centerMirrorMaterial = new THREE.MeshBasicMaterial({
      map: this.centerRenderTarget.texture,
      side: THREE.DoubleSide,
    });
  }

  /**
   * Bind the real-time optical reflection textures to the bus mirror surfaces
   */
  public attachToBus(busMesh: VehicleMeshObject) {
    if (busMesh.leftMirrorMesh) {
      busMesh.leftMirrorMesh.material = this.leftMirrorMaterial;
    }
    if (busMesh.rightMirrorMesh) {
      busMesh.rightMirrorMesh.material = this.rightMirrorMaterial;
    }
    if (busMesh.centerMirrorMesh) {
      busMesh.centerMirrorMesh.material = this.centerMirrorMaterial;
    }
  }

  /**
   * Get the center rearview mirror texture for in-HUD PIP view
   */
  public getCenterMirrorTexture(): THREE.Texture {
    return this.centerRenderTarget.texture;
  }

  public getLeftMirrorTexture(): THREE.Texture {
    return this.leftRenderTarget.texture;
  }

  public getRightMirrorTexture(): THREE.Texture {
    return this.rightRenderTarget.texture;
  }

  /**
   * Render real-time rear perspectives into the mirror textures.
   */
  public renderMirror(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    busMesh: VehicleMeshObject,
    isCockpitView: boolean,
    isSoftwareGl: boolean
  ) {
    this.frameCounter++;
    // Conserve performance on software renderer
    if (isSoftwareGl && this.frameCounter % 2 !== 0) {
      return;
    }

    const busPos = busMesh.position;
    const busRotY = busMesh.rotation.y;
    const currentRenderTarget = renderer.getRenderTarget();

    // 1. LEFT MIRROR: Mounted on left mirror bracket (+X), looks back down the left flank
    // Bus width is 2.6m (half is 1.3m). Bracket is at x = +1.58m
    const leftCamX = busPos.x + 1.58;
    const leftCamY = busPos.y + 2.15;
    const leftCamZ = busPos.z + 4.95;
    this.leftCamera.position.set(leftCamX, leftCamY, leftCamZ);
    // Look backward (-Z) and angled slightly outward along the left lane (+X)
    this.leftCamera.lookAt(busPos.x + 2.6, busPos.y + 1.7, busPos.z - 80);

    renderer.setRenderTarget(this.leftRenderTarget);
    renderer.render(scene, this.leftCamera);

    // 2. RIGHT MIRROR: Mounted on right mirror bracket (-X), looks back down the right flank
    // Bracket is at x = -1.58m
    const rightCamX = busPos.x - 1.58;
    const rightCamY = busPos.y + 2.15;
    const rightCamZ = busPos.z + 4.95;
    this.rightCamera.position.set(rightCamX, rightCamY, rightCamZ);
    // Look backward (-Z) and angled slightly outward along the right/oncoming lane (-X)
    this.rightCamera.lookAt(busPos.x - 2.6, busPos.y + 1.7, busPos.z - 80);

    renderer.setRenderTarget(this.rightRenderTarget);
    renderer.render(scene, this.rightCamera);

    // 3. CENTER MIRROR: Positioned at rear window or top center of bus looking straight back
    this.centerCamera.position.set(busPos.x - 0.2, busPos.y + 2.6, busPos.z - 5.85);
    this.centerCamera.lookAt(busPos.x - 0.2, busPos.y + 1.8, busPos.z - 120);

    renderer.setRenderTarget(this.centerRenderTarget);
    renderer.render(scene, this.centerCamera);

    // Restore primary render target
    renderer.setRenderTarget(currentRenderTarget);
  }

  public dispose() {
    this.leftRenderTarget.dispose();
    this.rightRenderTarget.dispose();
    this.centerRenderTarget.dispose();
    this.leftMirrorMaterial.dispose();
    this.rightMirrorMaterial.dispose();
    this.centerMirrorMaterial.dispose();
  }
}

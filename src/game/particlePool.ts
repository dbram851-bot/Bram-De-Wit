import * as THREE from 'three';

interface ParticleSlot {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  lifetime: number;
  baseScale: number;
  gravity: number;
}

const POOL_CAPACITY = 140;
const _matrix = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _color = new THREE.Color();

/**
 * Zero-GC InstancedMesh ring-buffer particle pool for build dust,
 * demolition rubble, and factory smoke puffs.
 */
export class ParticlePool {
  readonly mesh: THREE.InstancedMesh;
  private readonly slots: ParticleSlot[] = [];
  private cursor = 0;

  constructor() {
    const geometry = new THREE.DodecahedronGeometry(0.012, 0);
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.85,
      metalness: 0.05,
    });
    this.mesh = new THREE.InstancedMesh(geometry, material, POOL_CAPACITY);
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    for (let i = 0; i < POOL_CAPACITY; i++) {
      this.slots.push({
        active: false,
        x: 0,
        y: -10,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        age: 0,
        lifetime: 1,
        baseScale: 0,
        gravity: 0,
      });
      _matrix.makeScale(0, 0, 0);
      this.mesh.setMatrixAt(i, _matrix);
      _color.setHex(0xffffff);
      this.mesh.setColorAt(i, _color);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  emitBurst(
    x: number,
    y: number,
    z: number,
    count: number,
    hexColor: number,
    mode: 'dust' | 'rubble' | 'smoke'
  ): void {
    for (let i = 0; i < count; i++) {
      const slot = this.slots[this.cursor];
      this.cursor = (this.cursor + 1) % POOL_CAPACITY;

      const angle = Math.random() * Math.PI * 2;
      const speed =
        mode === 'rubble'
          ? 0.08 + Math.random() * 0.14
          : mode === 'dust'
            ? 0.05 + Math.random() * 0.09
            : 0.008 + Math.random() * 0.012;

      slot.active = true;
      slot.x = x + (Math.random() - 0.5) * 0.025;
      slot.y = y + Math.random() * 0.012;
      slot.z = z + (Math.random() - 0.5) * 0.025;
      slot.vx = Math.cos(angle) * speed;
      slot.vz = Math.sin(angle) * speed;
      slot.vy =
        mode === 'rubble'
          ? 0.14 + Math.random() * 0.12
          : mode === 'dust'
            ? 0.07 + Math.random() * 0.08
            : 0.05 + Math.random() * 0.03;
      slot.age = 0;
      slot.lifetime =
        mode === 'smoke'
          ? 1.1 + Math.random() * 0.5
          : 0.45 + Math.random() * 0.25;
      slot.baseScale =
        mode === 'smoke'
          ? 0.65 + Math.random() * 0.45
          : mode === 'rubble'
            ? 0.8 + Math.random() * 0.6
            : 0.65 + Math.random() * 0.5;
      slot.gravity = mode === 'smoke' ? -0.015 : 0.45;

      const idx = (this.cursor - 1 + POOL_CAPACITY) % POOL_CAPACITY;
      _color.setHex(hexColor);
      this.mesh.setColorAt(idx, _color);
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt: number): void {
    let anyChanged = false;
    for (let i = 0; i < POOL_CAPACITY; i++) {
      const s = this.slots[i];
      if (!s.active) continue;
      anyChanged = true;

      s.age += dt;
      if (s.age >= s.lifetime) {
        s.active = false;
        _matrix.makeScale(0, 0, 0);
        this.mesh.setMatrixAt(i, _matrix);
        continue;
      }

      s.vy -= s.gravity * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;
      if (s.y < 0.004) {
        s.y = 0.004;
        s.vy *= -0.35;
        s.vx *= 0.7;
        s.vz *= 0.7;
      }

      const t = s.age / s.lifetime;
      const scaleVal =
        s.gravity < 0
          ? s.baseScale * (0.6 + t * 0.9) * (1 - t)
          : s.baseScale * (1 - t * t);

      _pos.set(s.x, s.y, s.z);
      _scale.setScalar(Math.max(0.001, scaleVal));
      _matrix.compose(_pos, _quat, _scale);
      this.mesh.setMatrixAt(i, _matrix);
    }
    if (anyChanged) {
      this.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

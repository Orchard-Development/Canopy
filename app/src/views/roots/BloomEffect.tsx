import { useRef, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

interface BloomEffectProps {
  threshold?: number;
  strength?: number;
  radius?: number;
}

export default function BloomEffect({
  threshold = 0.2,
  strength = 1.5,
  radius = 0.4,
}: BloomEffectProps) {
  const { gl, scene, camera, size } = useThree();
  const composerRef = useRef<EffectComposer | null>(null);
  const bloomRef = useRef<UnrealBloomPass | null>(null);

  useEffect(() => {
    // Create a render target with alpha so the transparent canvas is preserved
    const rt = new THREE.WebGLRenderTarget(size.width, size.height, {
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
    });

    const composer = new EffectComposer(gl, rt);

    const renderPass = new RenderPass(scene, camera);
    renderPass.clearAlpha = 0;
    composer.addPass(renderPass);

    const bloom = new UnrealBloomPass(
      new THREE.Vector2(size.width, size.height),
      strength,
      radius,
      threshold,
    );
    composer.addPass(bloom);

    composerRef.current = composer;
    bloomRef.current = bloom;

    // Tell the renderer to clear with transparent black
    gl.setClearColor(0x000000, 0);

    return () => {
      composer.dispose();
      rt.dispose();
    };
  }, [gl, scene, camera]);

  useEffect(() => {
    if (bloomRef.current) {
      bloomRef.current.threshold = threshold;
      bloomRef.current.strength = strength;
      bloomRef.current.radius = radius;
    }
  }, [threshold, strength, radius]);

  useEffect(() => {
    composerRef.current?.setSize(size.width, size.height);
  }, [size]);

  useFrame(() => {
    if (composerRef.current) {
      gl.setClearColor(0x000000, 0);
      composerRef.current.render();
    }
  }, 1);

  return null;
}

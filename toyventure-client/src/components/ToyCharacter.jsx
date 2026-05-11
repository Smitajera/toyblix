import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

export default function ToyCharacter() {
  const headRef = useRef(null);

  // This useFrame hook runs on every frame, updating the animation
  useFrame((state) => {
    if (!headRef.current) return;

    // 1. Calculate the target rotation based on the mouse/pointer position
    // We multiply by Math.PI / 4 to limit how far the head can twist
    const targetX = (state.pointer.x * Math.PI) / 3;
    const targetY = (state.pointer.y * Math.PI) / 4;

    // 2. Smoothly interpolate (lerp) the head's current rotation to the target rotation
    // This creates that smooth, organic "looking around" feel rather than snapping
    headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, targetX, 0.1);
    headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, -targetY, 0.1);
  });

  return (
    // The Float component provides the gentle up-and-down idle animation
    <Float speed={2.5} rotationIntensity={0.2} floatIntensity={1.5}>
      <group position={[0, -1.2, 0]}>
        
        {/* === BODY === */}
        <mesh position={[0, 1.2, 0]} castShadow>
          <boxGeometry args={[1.6, 1.8, 1]} />
          <meshStandardMaterial color="#ef4444" roughness={0.3} metalness={0.1} />
        </mesh>

        {/* === HEAD GROUP (This is what rotates) === */}
        <group ref={headRef} position={[0, 2.6, 0]}>
          {/* Head Shape */}
          <mesh castShadow>
            <boxGeometry args={[1.3, 1.3, 1.3]} />
            <meshStandardMaterial color="#fcd34d" roughness={0.4} />
          </mesh>
          
          {/* Left Eye */}
          <mesh position={[-0.3, 0.1, 0.66]}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshBasicMaterial color="#1a1a1a" />
          </mesh>
          
          {/* Right Eye */}
          <mesh position={[0.3, 0.1, 0.66]}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshBasicMaterial color="#1a1a1a" />
          </mesh>
          
          {/* Cute Smile */}
          <mesh position={[0, -0.25, 0.66]}>
            <boxGeometry args={[0.4, 0.08, 0.05]} />
            <meshBasicMaterial color="#1a1a1a" />
          </mesh>
        </group>

        {/* === ARMS === */}
        {/* Left Arm */}
        <mesh position={[-1.1, 1.2, 0]} castShadow rotation={[0, 0, 0.2]}>
          <capsuleGeometry args={[0.25, 0.8, 4, 8]} />
          <meshStandardMaterial color="#3b82f6" roughness={0.2} />
        </mesh>
        {/* Right Arm */}
        <mesh position={[1.1, 1.2, 0]} castShadow rotation={[0, 0, -0.2]}>
          <capsuleGeometry args={[0.25, 0.8, 4, 8]} />
          <meshStandardMaterial color="#3b82f6" roughness={0.2} />
        </mesh>

        {/* === LEGS === */}
        <mesh position={[-0.4, 0.1, 0]} castShadow>
          <boxGeometry args={[0.5, 0.6, 0.5]} />
          <meshStandardMaterial color="#1e3a8a" />
        </mesh>
        <mesh position={[0.4, 0.1, 0]} castShadow>
          <boxGeometry args={[0.5, 0.6, 0.5]} />
          <meshStandardMaterial color="#1e3a8a" />
        </mesh>

      </group>
    </Float>
  );
}
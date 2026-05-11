import React, { useRef, useLayoutEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, MeshTransmissionMaterial, ContactShadows, Sparkles } from '@react-three/drei';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const PremiumAbstractToy = () => {
  const groupRef = useRef();
  const innerCubeRef = useRef();

  // Subtle continuous rotation for the inner element
  useFrame((state, delta) => {
    if (innerCubeRef.current) {
      innerCubeRef.current.rotation.x += delta * 0.2;
      innerCubeRef.current.rotation.y += delta * 0.3;
    }
  });

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: "#main-scroll-container",
          start: "top top",
          end: "bottom bottom",
          scrub: 1.2, // Buttery smooth scrubbing
        }
      });

      // Pro-level Cinematic Camera/Object Path
      tl.to(groupRef.current.position, { x: 2, y: -1, z: 2, ease: "sine.inOut" }, 0.1)
        .to(groupRef.current.rotation, { x: 0.5, y: Math.PI * 0.8, z: -0.2, ease: "sine.inOut" }, 0.1)
        
        .to(groupRef.current.position, { x: -2.5, y: 1, z: 1, ease: "power2.inOut" }, 0.3)
        .to(groupRef.current.rotation, { x: -0.2, y: Math.PI * 1.5, z: 0.2, ease: "power2.inOut" }, 0.3)
        
        .to(groupRef.current.position, { x: 1.5, y: -0.5, z: 3, ease: "power2.inOut" }, 0.6)
        .to(groupRef.current.rotation, { x: 0.4, y: Math.PI * 2.2, z: -0.3, ease: "power2.inOut" }, 0.6)

        .to(groupRef.current.position, { x: 0, y: 0.5, z: 2, ease: "expo.inOut" }, 0.9)
        .to(groupRef.current.rotation, { x: 0, y: Math.PI * 3, z: 0, ease: "expo.inOut" }, 0.9);
    });

    return () => ctx.revert();
  }, []);

  return (
    <group ref={groupRef} position={[0, 0, 0]} scale={1.2}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1.5}>
        
        {/* Main Premium Glass Block */}
        <mesh>
          <boxGeometry args={[2, 2, 2]} />
          <MeshTransmissionMaterial 
            backside 
            samples={4} 
            thickness={1} 
            roughness={0.1} 
            transmission={1} 
            ior={1.5} 
            chromaticAberration={0.06} 
            anisotropy={0.1} 
            color="#ffffff"
          />
        </mesh>

        {/* Inner Colorful Core (Refracts through the glass) */}
        <mesh ref={innerCubeRef}>
          <octahedronGeometry args={[0.8, 0]} />
          <meshPhysicalMaterial 
            color="#ea580c" 
            metalness={0.8} 
            roughness={0.2} 
            clearcoat={1} 
            clearcoatRoughness={0.1} 
          />
        </mesh>

        {/* Orbiting Elements */}
        <mesh position={[1.8, 1.2, 0]}>
          <sphereGeometry args={[0.3, 32, 32]} />
          <meshPhysicalMaterial color="#3b82f6" metalness={0.9} roughness={0.1} />
        </mesh>
        <mesh position={[-1.5, -1.5, 1]}>
          <sphereGeometry args={[0.2, 32, 32]} />
          <meshPhysicalMaterial color="#eab308" metalness={0.5} roughness={0.4} />
        </mesh>

      </Float>
    </group>
  );
};

export default function Scene3D() {
  return (
    <div className="fixed top-0 left-0 w-full h-screen z-0 pointer-events-none bg-[#f4f4f5]">
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }} dpr={[1, 2]}>
        {/* Premium Lighting Setup */}
        <ambientLight intensity={0.4} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={1} color="#ea580c" />
        
        <Environment preset="studio" />
        
        <PremiumAbstractToy />
        
        {/* Subtle magical dust */}
        <Sparkles count={100} scale={10} size={2} speed={0.4} opacity={0.2} color="#94a3b8" />
        
        <ContactShadows position={[0, -3.5, 0]} opacity={0.6} scale={20} blur={3} far={5} color="#1e293b" />
      </Canvas>
    </div>
  );
}
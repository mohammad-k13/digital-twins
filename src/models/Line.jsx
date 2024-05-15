import React, { useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import usePositionStore from '../store';

export function Line(props) {

  const { nodes, materials } = useGLTF('./models/line.gltf');
  const setClick = usePositionStore(state => state.setClick)
      
  return (
    <group {...props} dispose={null} onClick={() => {setClick()}}>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Sphere.geometry}
        material={new THREE.MeshBasicMaterial({color: "red"})}
        position={[1.5, 10, 0]}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Cylinder.geometry}
        material={new THREE.MeshBasicMaterial({color: "red"})}
        position={[1.5, 5.53, 0]}
      />
    </group>
  )
}
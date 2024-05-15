import { useFrame } from "@react-three/fiber";
import React, { useEffect, useRef, useState } from "react";
import usePositionStore from "../store";
import { Center, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { easing } from "maath";
import { Model } from "../models/Green_factory";
import { Line } from "../models/Line";

function CameraRig() {

	return (
		<>
			<OrbitControls />
			<PerspectiveCamera
				makeDefault
				position={[-10, 0, 0]}
				fov={85}
				ref={camera}
			/>

			<ambientLight intensity={2.3} />
			<directionalLight intensity={2.5} />

			<Center>
				<Model />
				<Line />
			</Center>
		</>
	);
}

export default CameraRig;

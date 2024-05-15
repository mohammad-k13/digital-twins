import { Center, Line, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import React, { Suspense, useRef } from "react";
import { Model } from "../models/Green_factory";
import { useControls } from "leva";
import { useFrame } from "@react-three/fiber";
import { easing } from "maath";
import Loading from "./Loading";

function Objects() {
	return (
		<>
			<PerspectiveCamera
				makeDefault
				position={[0, 5,9.5]}
				rotation={[-0.5, 0, 0]}
				fov={75}
			/>

			<ambientLight intensity={2.3} />
			<directionalLight intensity={2.5} />

			<Suspense fallback={<Loading />}>
				<Center>
					<Model />
					{/* MAIN AXES */}
					{/* <Line
					points={[
						[0, 0, 0],
						[0, 0, 100],
					]}
					color={"red"}
					lineWidth={2}
					/>
					<Line
					points={[
						[0, 0, 0],
						[0, 100, 0],
					]}
					color={"red"}
					lineWidth={2}
					/>
					<Line
					points={[
						[0, 0, 0],
						[100, 0, 0],
					]}
					color={"red"}
					lineWidth={2}
				/> */}
				</Center>
			</Suspense>
		</>
	);
}

export default Objects;

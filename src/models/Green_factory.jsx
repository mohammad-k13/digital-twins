import React, { useEffect, useRef, useState } from "react";
import { Html, useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { easing } from "maath";
import usePositionStore from "../store";
import { useControls } from "leva";
import * as THREE from "three";
import { sensorsInfo } from "../constances";

// easing.damp3(modelRef.current.position, [-5, 1, 3.85], 0.85, delta);
export function Model(props) {
	const { nodes, materials } = useGLTF("models/newModel.gltf");
	const [isRotating, setIsRotating] = useState(false);
	const [currentStage, setCurrentStage] = useState(null);
	const modelRef = useRef();
	const { click, setClick, sensorId } = usePositionStore((state) => ({
		click: state.clicked,
		setClick: state.setClick,
		sensorId: state.sensorId,
	}));
	// Get access to the Three.js renderer and viewport
	const { gl, viewport } = useThree();

	// Use a ref for the last mouse x position
	const lastX = useRef(0);
	const lastY = useRef(0);
	// Use a ref for rotation speed
	const rotationSpeed = useRef(0);
	// Define a damping factor to control rotation damping
	const dampingFactor = 0.95;

	// Handle pointer (mouse or touch) down event
	const handlePointerDown = (event) => {
		setIsRotating(true);

		// Calculate the clientX based on whether it's a touch event or a mouse event
		const clientX = event.touches ? event.touches[0].clientX : event.clientX;
		const clientY = event.touches ? event.touches[0].clientY : event.clientY;

		// Store the current clientX position for reference
		lastX.current = clientX;
		lastY.current = clientY;
	};

	// Handle pointer (mouse or touch) up event
	const handlePointerUp = (event) => {
		event.stopPropagation();
		event.preventDefault();
		setIsRotating(false);
	};

	// Handle pointer (mouse or touch) move event
	const handlePointerMove = (event) => {
		event.stopPropagation();
		event.preventDefault();

		if (isRotating) {
			// If rotation is enabled, calculate the change in clientX position
			const clientX = event.touches ? event.touches[0].clientX : event.clientX;
			const clientY = event.touches ? event.touches[0].clientY : event.clientY;
			// calculate the change in the horizontal position of the mouse cursor or touch input,
			// relative to the viewport's width
			const delta = (clientX - lastX.current) / viewport.width;
			const delta_y = ((clientY - lastY.current) / viewport.height) * 0.01;

			// Update the island's rotation based on the mouse/touch movement
			if (click) {
				modelRef.current.rotation.y += delta * 0.01 * Math.PI;
				modelRef.current.rotation.x += delta_y * 0.01 * Math.PI;
			} else {
				modelRef.current.rotation.y += delta * 0.01 * Math.PI;
			}

			// Update the reference for the last clientX position
			lastX.current = clientX;

			// Update the rotation speed
			rotationSpeed.current = delta * 0.01 * Math.PI;
		}
	};

	// Handle keydown events
	const handleKeyDown = (event) => {
		if (event.key === "ArrowLeft") {
			if (!isRotating) setIsRotating(true);

			modelRef.current.rotation.y += 0.005 * Math.PI;
			rotationSpeed.current = 0.007;
		} else if (event.key === "ArrowRight") {
			if (!isRotating) setIsRotating(true);

			modelRef.current.rotation.y -= 0.005 * Math.PI;
			rotationSpeed.current = -0.007;
		}
	};

	// Handle keyup events
	const handleKeyUp = (event) => {
		if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
			setIsRotating(false);
		}
	};

	useEffect(() => {
		// Add event listeners for pointer and keyboard events
		const canvas = gl.domElement;
		canvas.addEventListener("pointerdown", handlePointerDown);
		canvas.addEventListener("pointerup", handlePointerUp);
		canvas.addEventListener("pointermove", handlePointerMove);
		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("keyup", handleKeyUp);

		// Remove event listeners when component unmounts
		return () => {
			canvas.removeEventListener("pointerdown", handlePointerDown);
			canvas.removeEventListener("pointerup", handlePointerUp);
			canvas.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("keyup", handleKeyUp);
		};
	}, [gl, handlePointerDown, handlePointerUp, handlePointerMove, click]);

	// This function is called on each frame update
	useFrame((_state, _delta) => {
		//zoom-to-model animation via sensor mesh click
		let selectedSensorInfo = {};
		if (click) {
			//find info about selected sensor
			selectedSensorInfo = sensorsInfo.find((item) => item.id === sensorId);
			
			easing.damp3(modelRef.current.rotation, selectedSensorInfo.clicked.modelRotation, 0.25, _delta);
			easing.damp3(_state.camera.position, selectedSensorInfo.clicked.cameraPosition, 0.25, _delta);
			easing.damp3(_state.camera.rotation, selectedSensorInfo.clicked.cameraRotation, 0.25, _delta);
		} else {
			easing.damp3(_state.camera.position, [0, 5, 9.5], 0.25, _delta);
			easing.damp3(_state.camera.rotation, [-0.5, 0, 0], 0.25, _delta);
		}
		// If not rotating, apply damping to slow down the rotation (smoothly)
		if (!isRotating) {
			// Apply damping factor
			rotationSpeed.current *= dampingFactor;

			// Stop rotation when speed is very small
			if (Math.abs(rotationSpeed.current) < 0.001) {
				rotationSpeed.current = 0;
			}

			modelRef.current.rotation.y += rotationSpeed.current;
		} else {
			// When rotating, determine the current stage based on island's orientation
			const rotation = modelRef.current.rotation.y;

			/**
			 * Normalize the rotation value to ensure it stays within the range [0, 2 * Math.PI].
			 * The goal is to ensure that the rotation value remains within a specific range to
			 * prevent potential issues with very large or negative rotation values.
			 *  Here's a step-by-step explanation of what this code does:
			 *  1. rotation % (2 * Math.PI) calculates the remainder of the rotation value when divided
			 *     by 2 * Math.PI. This essentially wraps the rotation value around once it reaches a
			 *     full circle (360 degrees) so that it stays within the range of 0 to 2 * Math.PI.
			 *  2. (rotation % (2 * Math.PI)) + 2 * Math.PI adds 2 * Math.PI to the result from step 1.
			 *     This is done to ensure that the value remains positive and within the range of
			 *     0 to 2 * Math.PI even if it was negative after the modulo operation in step 1.
			 *  3. Finally, ((rotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) applies another
			 *     modulo operation to the value obtained in step 2. This step guarantees that the value
			 *     always stays within the range of 0 to 2 * Math.PI, which is equivalent to a full
			 *     circle in radians.
			 */
			const normalizedRotation = ((rotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

			// Set the current stage based on the island's orientation
			switch (true) {
				case normalizedRotation >= 5.45 && normalizedRotation <= 5.85:
					setCurrentStage(4);
					break;
				case normalizedRotation >= 0.85 && normalizedRotation <= 1.3:
					setCurrentStage(3);
					break;
				case normalizedRotation >= 2.4 && normalizedRotation <= 2.6:
					setCurrentStage(2);
					break;
				case normalizedRotation >= 4.25 && normalizedRotation <= 4.75:
					setCurrentStage(1);
					break;
				default:
					setCurrentStage(null);
			}
		}
	});

	return (
		<group
			{...props}
			ref={modelRef}>
			{/* first red one */}
			{/* <mesh
				castShadow
				receiveShadow
				geometry={nodes.Sphere.geometry}
				material={new THREE.MeshBasicMaterial({color: 'red'})}
				position={[4.418, 2.534, -0.872]}
				onClick={setClick}
			/> */}
			{/* second red one */}
			{/* <mesh
				castShadow
				receiveShadow
				geometry={nodes.Sphere.geometry}
				material={new THREE.MeshBasicMaterial({ color: "red" })}
				position={[-3.8, 2.0, 1.55]}
				onClick={setClick}
			/> */}
			{sensorsInfo.map((items, index) => (
				<mesh
					key={index}
					castShadow
					receiveShadow
					geometry={nodes.Sphere.geometry}
					material={new THREE.MeshBasicMaterial({ color: "red" })}
					position={items.meshPosition}
					onClick={() => {
						setClick(items.id);
					}}
				/>
			))}
			<group position={[0, 0, 3.135]}>
				<group
					position={[-0.56, 0.364, -1.638]}
					rotation={[-Math.PI / 2, 0, 0]}
					scale={0.017}>
					<group rotation={[Math.PI / 2, 0, 0]}>
						<group
							position={[214.654, 33.187, -143.45]}
							rotation={[-Math.PI / 2, 0, -2.381]}
							scale={100}>
							<mesh
								castShadow
								receiveShadow
								geometry={nodes.defaultMaterial_29.geometry}
								material={materials.DefaultMaterial}
								position={[-0.623, 0.593, 0]}
							/>
						</group>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial.geometry}
							material={materials.DefaultMaterial}
							position={[256.095, 75.033, -363.209]}
							rotation={[Math.PI, 0, Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_1.geometry}
							material={materials.DefaultMaterial}
							position={[256.095, 75.033, -363.209]}
							rotation={[Math.PI, 0, Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_2.geometry}
							material={materials.DefaultMaterial}
							position={[256.095, 75.033, -363.209]}
							rotation={[Math.PI, 0, Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_3.geometry}
							material={materials.DefaultMaterial}
							position={[256.095, 75.033, -363.209]}
							rotation={[Math.PI, 0, Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_4.geometry}
							material={materials.DefaultMaterial}
							position={[256.095, 75.033, -363.209]}
							rotation={[Math.PI, 0, Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_5.geometry}
							material={materials.DefaultMaterial}
							position={[256.095, 75.033, -363.209]}
							rotation={[Math.PI, 0, Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_6.geometry}
							material={materials.DefaultMaterial}
							position={[256.095, 75.033, -363.209]}
							rotation={[Math.PI, 0, Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_7.geometry}
							material={materials.DefaultMaterial}
							position={[256.095, 75.033, -363.209]}
							rotation={[Math.PI, 0, Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_8.geometry}
							material={materials.DefaultMaterial}
							position={[256.095, 75.033, -363.209]}
							rotation={[Math.PI, 0, Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_9.geometry}
							material={materials.DefaultMaterial}
							position={[256.095, 75.033, -363.209]}
							rotation={[Math.PI, 0, Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_10.geometry}
							material={materials.DefaultMaterial}
							position={[33.369, 75.033, -363.209]}
							rotation={[Math.PI, 0, Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_11.geometry}
							material={materials.DefaultMaterial}
							position={[33.369, 75.033, -363.209]}
							rotation={[Math.PI, 0, Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_12.geometry}
							material={materials.DefaultMaterial}
							position={[33.369, 75.033, -363.209]}
							rotation={[Math.PI, 0, Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_13.geometry}
							material={materials.DefaultMaterial}
							position={[33.369, 75.033, -363.209]}
							rotation={[Math.PI, 0, Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_14.geometry}
							material={materials.DefaultMaterial}
							position={[33.369, 75.033, -363.209]}
							rotation={[Math.PI, 0, Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_15.geometry}
							material={materials.DefaultMaterial}
							position={[33.369, 75.033, -363.209]}
							rotation={[Math.PI, 0, Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_16.geometry}
							material={materials.DefaultMaterial}
							position={[33.369, 75.033, -363.209]}
							rotation={[Math.PI, 0, Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_17.geometry}
							material={materials.DefaultMaterial}
							position={[33.369, 75.033, -363.209]}
							rotation={[Math.PI, 0, Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_18.geometry}
							material={materials.DefaultMaterial}
							position={[33.369, 75.033, -363.209]}
							rotation={[Math.PI, 0, Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_19.geometry}
							material={materials.DefaultMaterial}
							position={[0, 3.532, 362.76]}
							rotation={[0.008, 0, Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_20.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_21.geometry}
							material={materials.DefaultMaterial}
							position={[0, -2.629, 0]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_22.geometry}
							material={materials.DefaultMaterial}
							position={[-4.458, 0, -67.363]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_23.geometry}
							material={materials.DefaultMaterial}
							position={[-4.458, 0, -67.363]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_24.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_25.geometry}
							material={materials.DefaultMaterial}
							position={[0, 156.722, 147.005]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_26.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_27.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_28.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_30.geometry}
							material={materials.DefaultMaterial}
							position={[-102.226, 32.335, -257.472]}
							rotation={[-Math.PI / 2, 0, 2.853]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_31.geometry}
							material={materials.DefaultMaterial}
							position={[46.767, 1.026, 86.272]}
							rotation={[-Math.PI / 2, 0, 1.345]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_32.geometry}
							material={materials.DefaultMaterial}
							position={[72.904, 1.026, 68.719]}
							rotation={[-Math.PI / 2, 0, 1.345]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_33.geometry}
							material={materials.DefaultMaterial}
							position={[-89.489, 1.026, 118.249]}
							rotation={[-Math.PI / 2, 0, 1.345]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_34.geometry}
							material={materials.DefaultMaterial}
							position={[-34.235, 1.026, 90.459]}
							rotation={[-Math.PI / 2, 0, 1.345]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_35.geometry}
							material={materials.DefaultMaterial}
							position={[8.384, 1.026, 92.53]}
							rotation={[-Math.PI / 2, 0, 1.345]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_36.geometry}
							material={materials.DefaultMaterial}
							position={[246.146, 14.071, 432.718]}
							rotation={[-Math.PI / 2, 0, 1.175]}
							scale={141.955}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_37.geometry}
							material={materials.DefaultMaterial}
							position={[247.117, 14.813, 431.366]}
							rotation={[-Math.PI / 2, 0, 1.175]}
							scale={141.955}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_38.geometry}
							material={materials.DefaultMaterial}
							position={[245.464, 15.487, 434.253]}
							rotation={[-Math.PI / 2, 0, 1.175]}
							scale={141.955}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_39.geometry}
							material={materials.DefaultMaterial}
							position={[242.624, 14.167, 439.682]}
							rotation={[-Math.PI / 2, 0, -0.491]}
							scale={122.999}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_40.geometry}
							material={materials.DefaultMaterial}
							position={[243.709, 14.81, 440.632]}
							rotation={[-Math.PI / 2, 0, -0.491]}
							scale={122.999}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_41.geometry}
							material={materials.DefaultMaterial}
							position={[241.357, 15.394, 438.966]}
							rotation={[-Math.PI / 2, 0, -0.491]}
							scale={122.999}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_42.geometry}
							material={materials.DefaultMaterial}
							position={[194.228, 14.284, 439.841]}
							rotation={[-Math.PI / 2, 0, -0.491]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_43.geometry}
							material={materials.DefaultMaterial}
							position={[195.111, 14.806, 440.613]}
							rotation={[-Math.PI / 2, 0, -0.491]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_44.geometry}
							material={materials.DefaultMaterial}
							position={[193.198, 15.281, 439.259]}
							rotation={[-Math.PI / 2, 0, -0.491]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_45.geometry}
							material={materials.DefaultMaterial}
							position={[220.26, 14.284, 441.474]}
							rotation={[-Math.PI / 2, 0, 1.345]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_46.geometry}
							material={materials.DefaultMaterial}
							position={[220.775, 14.806, 440.419]}
							rotation={[-Math.PI / 2, 0, 1.345]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_47.geometry}
							material={materials.DefaultMaterial}
							position={[219.969, 15.281, 442.62]}
							rotation={[-Math.PI / 2, 0, 1.345]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_48.geometry}
							material={materials.DefaultMaterial}
							position={[337.882, 14.284, 413.015]}
							rotation={[-Math.PI / 2, 0, 1.345]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_49.geometry}
							material={materials.DefaultMaterial}
							position={[338.396, 14.806, 411.961]}
							rotation={[-Math.PI / 2, 0, 1.345]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_50.geometry}
							material={materials.DefaultMaterial}
							position={[303.639, 14.284, 426.503]}
							rotation={[-Math.PI / 2, 0, 3.11]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_51.geometry}
							material={materials.DefaultMaterial}
							position={[302.505, 14.806, 426.202]}
							rotation={[-Math.PI / 2, 0, 3.11]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_52.geometry}
							material={materials.DefaultMaterial}
							position={[304.82, 15.281, 426.567]}
							rotation={[-Math.PI / 2, 0, 3.11]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_53.geometry}
							material={materials.DefaultMaterial}
							position={[280.678, 14.284, 425.239]}
							rotation={[-Math.PI / 2, 0, 1.839]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_54.geometry}
							material={materials.DefaultMaterial}
							position={[280.966, 15.281, 426.386]}
							rotation={[-Math.PI / 2, 0, 1.839]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_55.geometry}
							material={materials.DefaultMaterial}
							position={[264.859, 10.322, 430.554]}
							rotation={[-Math.PI / 2, 0, 1.345]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_56.geometry}
							material={materials.DefaultMaterial}
							position={[280.63, 14.806, 424.067]}
							rotation={[-Math.PI / 2, 0, 1.839]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_57.geometry}
							material={materials.DefaultMaterial}
							position={[-6.514, 0, 92.862]}
							rotation={[-Math.PI / 2, 0, 1.345]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_58.geometry}
							material={materials.DefaultMaterial}
							position={[-0.116, 1.355, 98.086]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_59.geometry}
							material={materials.DefaultMaterial}
							position={[22.853, 1.355, 119.62]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_60.geometry}
							material={materials.DefaultMaterial}
							position={[-61.844, 1.355, -27.524]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_61.geometry}
							material={materials.DefaultMaterial}
							position={[-22.367, 1.355, 20.089]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_62.geometry}
							material={materials.DefaultMaterial}
							position={[-14.824, 1.355, 62.086]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_63.geometry}
							material={materials.DefaultMaterial}
							position={[-293.005, 14.401, 370.103]}
							rotation={[-Math.PI / 2, 0, -0.169]}
							scale={141.955}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_64.geometry}
							material={materials.DefaultMaterial}
							position={[-291.469, 15.142, 370.746]}
							rotation={[-Math.PI / 2, 0, -0.169]}
							scale={141.955}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_65.geometry}
							material={materials.DefaultMaterial}
							position={[-294.653, 15.817, 369.783]}
							rotation={[-Math.PI / 2, 0, -0.169]}
							scale={141.955}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_66.geometry}
							material={materials.DefaultMaterial}
							position={[-300.581, 14.497, 368.233]}
							rotation={[-Math.PI / 2, 0, -1.836]}
							scale={122.999}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_67.geometry}
							material={materials.DefaultMaterial}
							position={[-301.263, 15.139, 369.504]}
							rotation={[-Math.PI / 2, 0, -1.836]}
							scale={122.999}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_68.geometry}
							material={materials.DefaultMaterial}
							position={[-300.168, 15.724, 366.837]}
							rotation={[-Math.PI / 2, 0, -1.836]}
							scale={122.999}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_69.geometry}
							material={materials.DefaultMaterial}
							position={[-311.592, 14.613, 321.106]}
							rotation={[-Math.PI / 2, 0, -1.836]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_70.geometry}
							material={materials.DefaultMaterial}
							position={[-312.147, 15.135, 322.139]}
							rotation={[-Math.PI / 2, 0, -1.836]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_71.geometry}
							material={materials.DefaultMaterial}
							position={[-311.257, 15.611, 319.971]}
							rotation={[-Math.PI / 2, 0, -1.836]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_72.geometry}
							material={materials.DefaultMaterial}
							position={[-307.344, 14.613, 346.841]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_73.geometry}
							material={materials.DefaultMaterial}
							position={[-306.201, 15.135, 347.106]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_74.geometry}
							material={materials.DefaultMaterial}
							position={[-308.527, 15.611, 346.814]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_75.geometry}
							material={materials.DefaultMaterial}
							position={[-253.224, 14.613, 455.08]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_76.geometry}
							material={materials.DefaultMaterial}
							position={[-252.082, 15.135, 455.345]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_77.geometry}
							material={materials.DefaultMaterial}
							position={[-274.05, 14.613, 424.736]}
							rotation={[-Math.PI / 2, 0, 1.766]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_78.geometry}
							material={materials.DefaultMaterial}
							position={[-274.012, 15.135, 423.564]}
							rotation={[-Math.PI / 2, 0, 1.766]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_79.geometry}
							material={materials.DefaultMaterial}
							position={[-273.848, 15.611, 425.902]}
							rotation={[-Math.PI / 2, 0, 1.766]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_80.geometry}
							material={materials.DefaultMaterial}
							position={[-277.969, 14.613, 402.077]}
							rotation={[-Math.PI / 2, 0, 0.495]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_81.geometry}
							material={materials.DefaultMaterial}
							position={[-279.023, 15.611, 402.615]}
							rotation={[-Math.PI / 2, 0, 0.495]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_82.geometry}
							material={materials.DefaultMaterial}
							position={[-286.698, 10.651, 387.853]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_83.geometry}
							material={materials.DefaultMaterial}
							position={[-276.838, 15.135, 401.767]}
							rotation={[-Math.PI / 2, 0, 0.495]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_84.geometry}
							material={materials.DefaultMaterial}
							position={[-18.49, 0.329, 47.642]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_85.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_86.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_87.geometry}
							material={materials.DefaultMaterial}
							position={[143.217, 28.971, 346.656]}
							rotation={[-Math.PI / 2, 0, -Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_88.geometry}
							material={materials.DefaultMaterial}
							position={[143.217, 28.971, 315.03]}
							rotation={[-Math.PI / 2, 0, -Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_89.geometry}
							material={materials.DefaultMaterial}
							position={[143.217, 28.971, 283.404]}
							rotation={[-Math.PI / 2, 0, -Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_90.geometry}
							material={materials.DefaultMaterial}
							position={[143.217, 28.971, 251.778]}
							rotation={[-Math.PI / 2, 0, -Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_91.geometry}
							material={materials.DefaultMaterial}
							position={[143.217, 28.971, 220.152]}
							rotation={[-Math.PI / 2, 0, -Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_92.geometry}
							material={materials.DefaultMaterial}
							position={[165.023, 65.765, 346.656]}
							rotation={[-Math.PI / 2, 0, -Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_93.geometry}
							material={materials.DefaultMaterial}
							position={[165.023, 65.765, 315.03]}
							rotation={[-Math.PI / 2, 0, -Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_94.geometry}
							material={materials.DefaultMaterial}
							position={[165.023, 65.765, 283.404]}
							rotation={[-Math.PI / 2, 0, -Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_95.geometry}
							material={materials.DefaultMaterial}
							position={[165.023, 65.765, 251.778]}
							rotation={[-Math.PI / 2, 0, -Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_96.geometry}
							material={materials.DefaultMaterial}
							position={[165.023, 65.765, 220.152]}
							rotation={[-Math.PI / 2, 0, -Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_97.geometry}
							material={materials.DefaultMaterial}
							position={[143.265, 101.4, 346.656]}
							rotation={[-Math.PI / 2, 0, -Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_98.geometry}
							material={materials.DefaultMaterial}
							position={[143.265, 101.4, 315.03]}
							rotation={[-Math.PI / 2, 0, -Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_99.geometry}
							material={materials.DefaultMaterial}
							position={[143.265, 101.4, 283.404]}
							rotation={[-Math.PI / 2, 0, -Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_100.geometry}
							material={materials.DefaultMaterial}
							position={[143.265, 101.4, 251.778]}
							rotation={[-Math.PI / 2, 0, -Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_101.geometry}
							material={materials.DefaultMaterial}
							position={[143.265, 101.4, 220.152]}
							rotation={[-Math.PI / 2, 0, -Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_102.geometry}
							material={materials.DefaultMaterial}
							position={[107.654, 115.704, 346.656]}
							rotation={[-Math.PI / 2, 0, -Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_103.geometry}
							material={materials.DefaultMaterial}
							position={[107.654, 115.704, 315.03]}
							rotation={[-Math.PI / 2, 0, -Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_104.geometry}
							material={materials.DefaultMaterial}
							position={[107.654, 115.704, 283.404]}
							rotation={[-Math.PI / 2, 0, -Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_105.geometry}
							material={materials.DefaultMaterial}
							position={[107.654, 115.704, 251.778]}
							rotation={[-Math.PI / 2, 0, -Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_106.geometry}
							material={materials.DefaultMaterial}
							position={[107.654, 115.704, 220.152]}
							rotation={[-Math.PI / 2, 0, -Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_107.geometry}
							material={materials.DefaultMaterial}
							position={[-141.614, 28.971, 220.152]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_108.geometry}
							material={materials.DefaultMaterial}
							position={[-141.614, 28.971, 251.778]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_109.geometry}
							material={materials.DefaultMaterial}
							position={[-141.614, 28.971, 283.404]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_110.geometry}
							material={materials.DefaultMaterial}
							position={[-141.614, 28.971, 315.03]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_111.geometry}
							material={materials.DefaultMaterial}
							position={[-141.614, 28.971, 346.656]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_112.geometry}
							material={materials.DefaultMaterial}
							position={[-163.42, 65.765, 220.152]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_113.geometry}
							material={materials.DefaultMaterial}
							position={[-163.42, 65.765, 251.778]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_114.geometry}
							material={materials.DefaultMaterial}
							position={[-163.42, 65.765, 283.404]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_115.geometry}
							material={materials.DefaultMaterial}
							position={[-163.42, 65.765, 315.03]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_116.geometry}
							material={materials.DefaultMaterial}
							position={[-163.42, 65.765, 346.656]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_117.geometry}
							material={materials.DefaultMaterial}
							position={[-141.661, 101.4, 220.152]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_118.geometry}
							material={materials.DefaultMaterial}
							position={[-141.661, 101.4, 251.778]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_119.geometry}
							material={materials.DefaultMaterial}
							position={[-141.661, 101.4, 283.404]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_120.geometry}
							material={materials.DefaultMaterial}
							position={[-141.661, 101.4, 315.03]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_121.geometry}
							material={materials.DefaultMaterial}
							position={[-141.661, 101.4, 346.656]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_122.geometry}
							material={materials.DefaultMaterial}
							position={[-106.051, 115.704, 220.152]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_123.geometry}
							material={materials.DefaultMaterial}
							position={[-106.051, 115.704, 251.778]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_124.geometry}
							material={materials.DefaultMaterial}
							position={[-106.051, 115.704, 283.404]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_125.geometry}
							material={materials.DefaultMaterial}
							position={[-106.051, 115.704, 315.03]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_126.geometry}
							material={materials.DefaultMaterial}
							position={[-106.051, 115.704, 346.656]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_127.geometry}
							material={materials.DefaultMaterial}
							position={[165.31, 89.061, 346.656]}
							rotation={[-Math.PI / 2, 0, 2.371]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_128.geometry}
							material={materials.DefaultMaterial}
							position={[165.31, 89.061, 315.809]}
							rotation={[-Math.PI / 2, 0, 3.114]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_129.geometry}
							material={materials.DefaultMaterial}
							position={[165.31, 89.061, 284.963]}
							rotation={[-Math.PI / 2, 0, 2.051]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_130.geometry}
							material={materials.DefaultMaterial}
							position={[165.31, 89.061, 254.117]}
							rotation={[-Math.PI / 2, 0, -0.335]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_131.geometry}
							material={materials.DefaultMaterial}
							position={[165.31, 89.061, 223.271]}
							rotation={[-Math.PI / 2, 0, -0.74]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_132.geometry}
							material={materials.DefaultMaterial}
							position={[107.673, 138.684, 346.656]}
							rotation={[-Math.PI / 2, 0, 2.371]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_133.geometry}
							material={materials.DefaultMaterial}
							position={[107.673, 138.684, 315.809]}
							rotation={[-Math.PI / 2, 0, 3.114]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_134.geometry}
							material={materials.DefaultMaterial}
							position={[107.673, 138.684, 284.963]}
							rotation={[-Math.PI / 2, 0, 2.051]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_135.geometry}
							material={materials.DefaultMaterial}
							position={[107.673, 138.684, 254.117]}
							rotation={[-Math.PI / 2, 0, -0.335]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_136.geometry}
							material={materials.DefaultMaterial}
							position={[107.673, 138.684, 223.271]}
							rotation={[-Math.PI / 2, 0, -0.74]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_137.geometry}
							material={materials.DefaultMaterial}
							position={[143.148, 52.401, 346.656]}
							rotation={[-Math.PI / 2, 0, -0.386]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_138.geometry}
							material={materials.DefaultMaterial}
							position={[143.148, 52.401, 315.809]}
							rotation={[-Math.PI / 2, 0, -0.148]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_139.geometry}
							material={materials.DefaultMaterial}
							position={[143.148, 52.401, 284.963]}
							rotation={[-Math.PI / 2, 0, -0.731]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_140.geometry}
							material={materials.DefaultMaterial}
							position={[143.148, 52.401, 254.117]}
							rotation={[-Math.PI / 2, 0, 2.005]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_141.geometry}
							material={materials.DefaultMaterial}
							position={[143.148, 52.401, 223.271]}
							rotation={[-Math.PI / 2, 0, -Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_142.geometry}
							material={materials.DefaultMaterial}
							position={[143.148, 124.14, 346.656]}
							rotation={[-Math.PI / 2, 0, -0.386]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_143.geometry}
							material={materials.DefaultMaterial}
							position={[33.369, 75.033, -363.209]}
							rotation={[Math.PI, 0, Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_144.geometry}
							material={materials.DefaultMaterial}
							position={[143.148, 124.14, 284.963]}
							rotation={[-Math.PI / 2, 0, -0.731]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_145.geometry}
							material={materials.DefaultMaterial}
							position={[143.148, 124.14, 254.117]}
							rotation={[-Math.PI / 2, 0, 2.005]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_146.geometry}
							material={materials.DefaultMaterial}
							position={[143.148, 124.14, 223.271]}
							rotation={[-Math.PI / 2, 0, -Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_147.geometry}
							material={materials.DefaultMaterial}
							position={[-163.688, 89.061, 223.27]}
							rotation={[-Math.PI / 2, 0, -0.771]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_148.geometry}
							material={materials.DefaultMaterial}
							position={[-163.688, 89.061, 254.117]}
							rotation={[-Math.PI / 2, 0, -0.027]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_149.geometry}
							material={materials.DefaultMaterial}
							position={[-163.688, 89.061, 284.963]}
							rotation={[-Math.PI / 2, 0, -1.09]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_150.geometry}
							material={materials.DefaultMaterial}
							position={[-163.688, 89.061, 315.809]}
							rotation={[-Math.PI / 2, 0, 2.807]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_151.geometry}
							material={materials.DefaultMaterial}
							position={[-163.688, 89.061, 346.656]}
							rotation={[-Math.PI / 2, 0, 2.401]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_152.geometry}
							material={materials.DefaultMaterial}
							position={[-106.051, 138.684, 223.27]}
							rotation={[-Math.PI / 2, 0, -0.771]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_153.geometry}
							material={materials.DefaultMaterial}
							position={[-106.051, 138.684, 254.117]}
							rotation={[-Math.PI / 2, 0, -0.027]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_154.geometry}
							material={materials.DefaultMaterial}
							position={[-106.051, 138.684, 284.963]}
							rotation={[-Math.PI / 2, 0, -1.09]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_155.geometry}
							material={materials.DefaultMaterial}
							position={[-106.051, 138.684, 315.809]}
							rotation={[-Math.PI / 2, 0, 2.807]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_156.geometry}
							material={materials.DefaultMaterial}
							position={[-106.051, 138.684, 346.656]}
							rotation={[-Math.PI / 2, 0, 2.401]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_157.geometry}
							material={materials.DefaultMaterial}
							position={[-141.526, 52.401, 223.27]}
							rotation={[-Math.PI / 2, 0, 2.756]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_158.geometry}
							material={materials.DefaultMaterial}
							position={[-141.526, 52.401, 254.117]}
							rotation={[-Math.PI / 2, 0, 2.993]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_159.geometry}
							material={materials.DefaultMaterial}
							position={[-141.526, 52.401, 284.963]}
							rotation={[-Math.PI / 2, 0, 2.411]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_160.geometry}
							material={materials.DefaultMaterial}
							position={[-141.526, 52.401, 315.809]}
							rotation={[-Math.PI / 2, 0, -1.137]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_161.geometry}
							material={materials.DefaultMaterial}
							position={[-141.526, 52.401, 346.656]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_162.geometry}
							material={materials.DefaultMaterial}
							position={[-141.526, 124.14, 223.27]}
							rotation={[-Math.PI / 2, 0, 2.756]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_163.geometry}
							material={materials.DefaultMaterial}
							position={[-141.526, 124.14, 254.117]}
							rotation={[-Math.PI / 2, 0, 2.993]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_164.geometry}
							material={materials.DefaultMaterial}
							position={[-141.526, 124.14, 284.963]}
							rotation={[-Math.PI / 2, 0, 2.411]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_165.geometry}
							material={materials.DefaultMaterial}
							position={[-141.526, 124.14, 315.809]}
							rotation={[-Math.PI / 2, 0, -1.137]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_166.geometry}
							material={materials.DefaultMaterial}
							position={[-141.526, 124.14, 346.656]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_167.geometry}
							material={materials.DefaultMaterial}
							position={[0, 0.622, 0]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_168.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_169.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_170.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_171.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_172.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_173.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_174.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_175.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_176.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_177.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_178.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_179.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_180.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_181.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_182.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_183.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_184.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_185.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_186.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_187.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_188.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_189.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_190.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_191.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_192.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_193.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_194.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_195.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_196.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_197.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_198.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_199.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_200.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_201.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_202.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_203.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_204.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_205.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_206.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_207.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_208.geometry}
							material={materials.DefaultMaterial}
							position={[143.148, 124.14, 315.809]}
							rotation={[-Math.PI / 2, 0, -0.148]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_209.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_210.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_211.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_212.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_213.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_214.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_215.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_216.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_217.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_218.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_219.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_220.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_221.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_222.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_223.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_224.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_225.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_226.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_227.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_228.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_229.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_230.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_231.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_232.geometry}
							material={materials.DefaultMaterial}
							position={[-126.654, 61.595, -145.573]}
							rotation={[-Math.PI / 2, 0, 1.262]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_233.geometry}
							material={materials.DefaultMaterial}
							position={[258.172, 98.339, 366.431]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_234.geometry}
							material={materials.DefaultMaterial}
							position={[258.172, 88.808, 299.393]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_235.geometry}
							material={materials.DefaultMaterial}
							position={[258.172, 88.808, 299.393]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_236.geometry}
							material={materials.DefaultMaterial}
							position={[258.172, 64.647, 297.15]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_237.geometry}
							material={materials.DefaultMaterial}
							position={[258.172, -0.795, 381.23]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_238.geometry}
							material={materials.DefaultMaterial}
							position={[258.172, 88.808, 299.393]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_239.geometry}
							material={materials.DefaultMaterial}
							position={[258.172, 104.927, 297.15]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_240.geometry}
							material={materials.DefaultMaterial}
							position={[258.172, 88.808, 299.393]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_241.geometry}
							material={materials.DefaultMaterial}
							position={[150.004, 93.657, -149.729]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_242.geometry}
							material={materials.DefaultMaterial}
							position={[99.864, 32.335, -161.319]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_243.geometry}
							material={materials.DefaultMaterial}
							position={[120.658, 129.645, -161.436]}
							rotation={[-1.778, 0.627, -0.44]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_244.geometry}
							material={materials.DefaultMaterial}
							position={[99.864, 32.335, -161.319]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_245.geometry}
							material={materials.DefaultMaterial}
							position={[191.355, 0.033, 493.378]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_246.geometry}
							material={materials.DefaultMaterial}
							position={[-220.384, 12.653, 308.631]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_247.geometry}
							material={materials.DefaultMaterial}
							position={[-220.384, 11.448, 308.631]}
							rotation={[-Math.PI / 2, 0, 0.964]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_248.geometry}
							material={materials.DefaultMaterial}
							position={[-202.372, 11.448, 287.231]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_249.geometry}
							material={materials.DefaultMaterial}
							position={[-197.099, 3.894, 347.971]}
							rotation={[-1.786, 1.033, 0.25]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_250.geometry}
							material={materials.DefaultMaterial}
							position={[-197.099, 3.894, 338.15]}
							rotation={[-Math.PI / 2, Math.PI / 3, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_251.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_252.geometry}
							material={materials.DefaultMaterial}
							position={[-103.61, 61.595, -165.188]}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_253.geometry}
							material={materials.DefaultMaterial}
							position={[-223.005, 32.335, -208.85]}
							rotation={[-Math.PI / 2, 0, -2.468]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_254.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_255.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_256.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_257.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_258.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_259.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_260.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_261.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_262.geometry}
							material={materials.DefaultMaterial}
							rotation={[-Math.PI / 2, 0, 0]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_263.geometry}
							material={materials.DefaultMaterial}
							position={[-189.357, 75.033, -363.209]}
							rotation={[Math.PI, 0, Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_264.geometry}
							material={materials.DefaultMaterial}
							position={[-189.357, 75.033, -363.209]}
							rotation={[Math.PI, 0, Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_265.geometry}
							material={materials.DefaultMaterial}
							position={[-189.357, 75.033, -363.209]}
							rotation={[Math.PI, 0, Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_266.geometry}
							material={materials.DefaultMaterial}
							position={[-189.357, 75.033, -363.209]}
							rotation={[Math.PI, 0, Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_267.geometry}
							material={materials.DefaultMaterial}
							position={[-189.357, 75.033, -363.209]}
							rotation={[Math.PI, 0, Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_268.geometry}
							material={materials.DefaultMaterial}
							position={[-189.357, 75.033, -363.209]}
							rotation={[Math.PI, 0, Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_269.geometry}
							material={materials.DefaultMaterial}
							position={[-189.357, 75.033, -363.209]}
							rotation={[Math.PI, 0, Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_270.geometry}
							material={materials.DefaultMaterial}
							position={[-189.357, 75.033, -363.209]}
							rotation={[Math.PI, 0, Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_271.geometry}
							material={materials.DefaultMaterial}
							position={[-189.357, 75.033, -363.209]}
							rotation={[Math.PI, 0, Math.PI]}
							scale={100}
						/>
						<mesh
							castShadow
							receiveShadow
							geometry={nodes.defaultMaterial_272.geometry}
							material={materials.DefaultMaterial}
							position={[-189.357, 75.033, -363.209]}
							rotation={[Math.PI, 0, Math.PI]}
							scale={100}
						/>
					</group>
				</group>
			</group>
		</group>
	);
}

import { Canvas } from "@react-three/fiber";
import { Center, CubicBezierLine, Helper, Line, OrbitControls, PerspectiveCamera } from "@react-three/drei";

// LOCAL IMPORT
import { Model } from "./models/Green_factory";
import { useEffect, useRef } from "react";
import usePositionStore from "./store";
import MyComponent from './components/Test'
import { VertexNormalsHelper } from "three";
import { useControls } from "leva";
import Objects from "./components/3DObject";

function App() {
	const camera = useRef();
	const clicked = usePositionStore((state) => state.clicked);

	// useEffect(() => {
	// 	if (clicked && camera.current !== null) {
	// 	  // Move the camera to a new position (e.g., [5, 0, 0])
	// 	  camera.current.position.set(5, 0, 0);
	// 	  // Recalculate the projection matrix
	// 	  camera.current.updateProjectionMatrix();
	// 	} else {
	// 	  // Reset the camera position
	// 	  camera.current.position.set(-10, 0, 0);
	// 	  // Recalculate the projection matrix
	// 	  camera.current.updateProjectionMatrix();
	// 	}
	//     }, [clicked]);
	  

	return (
		<Canvas
			style={{ width: "100%", height: "100vh", backgroundColor: "black" }}>
			<Objects />
		</Canvas>
	);
}

export default App;
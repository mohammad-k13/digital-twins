import { Html } from "@react-three/drei";
import React from "react";

function Loading() {
	return (
		<Html>
			<h2
				style={{
					fontSize: "35px",
					color: "white",
					position: "absolute",
					top: 0,
					left: 0,
					transform: "translate(-50%, -50%)",
				}}>
				Loading...
			</h2>
		</Html>
	);
}

export default Loading;

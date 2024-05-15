import { create } from "zustand";

const usePositionStore = create((set) => ({
	position: [0, 0, 0],
	clicked: false,
	sensorId: null,
	setClick: (newId) => set((state) => ({ clicked: !state.clicked, sensorId: !state.clicked ? newId : null })),
	setPosition: (newPosition) => set({ position: newPosition }),
}));

export default usePositionStore;

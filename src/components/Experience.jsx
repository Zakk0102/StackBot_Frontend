import {
  CameraControls,
  ContactShadows,
  Environment,
  Text,
  useTexture,
} from "@react-three/drei";
import { Suspense, useEffect, useRef, useState } from "react";
import { useChat } from "../hooks/useChat";
import { Avatar } from "./Avatar";

const Dots = (props) => {
  const { loading } = useChat();
  const [loadingText, setLoadingText] = useState("");
  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadingText((loadingText) => {
          if (loadingText.length > 2) {
            return ".";
          }
          return loadingText + ".";
        });
      }, 800);
      return () => clearInterval(interval);
    } else {
      setLoadingText("");
    }
  }, [loading]);
  if (!loading) return null;
  return (
    <group {...props}>
      <Text fontSize={0.14} anchorX={"left"} anchorY={"bottom"}>
        {loadingText}
        <meshBasicMaterial attach="material" color="black" />
      </Text>
    </group>
  );
};

export const Experience = () => {
  const cameraControls = useRef();
  const { cameraZoomed } = useChat();

  useEffect(() => {
    // Initial camera position - centered and at eye level
    cameraControls.current.setLookAt(0, 1.0, 3.5, 0, 1.0, 0);
  }, []);

  useEffect(() => {
    if (cameraZoomed) {
      // Closer view when zoomed, maintaining center position
      cameraControls.current.setLookAt(0, 1.0, 2, 0, 1.0, 0, true);
    } else {
      // Default view, centered and at eye level
      cameraControls.current.setLookAt(0, 1.0, 3.5, 0, 1.0, 0, true);
    }
  }, [cameraZoomed]);

  return (
    <>
      <CameraControls ref={cameraControls} />
      <Environment preset="sunset" />
      <Suspense>
        {/* <Dots position-y={1.3} position-x={-0.03} /> */}
      </Suspense>
      <group position={[0, -0.5, 0]} rotation={[0, 0, 0]}>
        <Avatar scale={1.3} />
      </group>
      <ContactShadows opacity={0.7} scale={5} position-y={-0.5} />
    </>
  );
};

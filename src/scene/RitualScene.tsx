import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, Environment, Float, PerspectiveCamera } from '@react-three/drei'
import { useEffect, useRef } from 'react'
import { Color, InstancedMesh, Matrix4, Object3D, Quaternion, Vector3 } from 'three'
import type { Mesh } from 'three'
import type { RitualSnapshot } from '../state/useRitualMachine'
import type { YarrowGroup } from '../domain/yarrowStalks'
import { activeTheme } from '../theme/themes'

type RitualSceneProps = {
  snapshot: RitualSnapshot
  onBegin: () => void
}

const theme = activeTheme

function AmbientWarmth() {
  const glowRef = useRef<Mesh>(null)

  useFrame(({ clock }) => {
    if (!glowRef.current) return
    const pulse = 1 + Math.sin(clock.elapsedTime * 2.2) * 0.06
    glowRef.current.scale.set(0.28 * pulse, 0.08 * pulse, 0.28 * pulse)
  })

  return (
    <group position={[1.55, -0.24, -1.32]}>
      <mesh ref={glowRef} position={[0, 0.2, 0]}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial color={theme.palette.warmLight} transparent opacity={0.28} />
      </mesh>
      <pointLight color={theme.palette.warmLight} intensity={18} distance={3.8} decay={2} position={[0, 0.35, 0]} />
    </group>
  )
}

function RobeSleeves() {
  return (
    <group position={[0, -0.38, -0.42]}>
      <mesh position={[-0.56, 0, 0]} rotation={[0.18, 0, -0.18]}>
        <capsuleGeometry args={[0.17, 0.92, 12, 24]} />
        <meshStandardMaterial color={theme.palette.robeShadow} roughness={0.92} />
      </mesh>
      <mesh position={[0.56, 0, 0]} rotation={[0.18, 0, 0.18]}>
        <capsuleGeometry args={[0.17, 0.92, 12, 24]} />
        <meshStandardMaterial color={theme.palette.robe} roughness={0.92} />
      </mesh>
      <mesh position={[-0.28, -0.05, -0.42]} rotation={[0.22, 0.12, -0.28]}>
        <boxGeometry args={[0.28, 0.08, 0.18]} />
        <meshStandardMaterial color={theme.palette.hand} roughness={0.78} />
      </mesh>
      <mesh position={[0.28, -0.05, -0.42]} rotation={[0.22, -0.12, 0.28]}>
        <boxGeometry args={[0.28, 0.08, 0.18]} />
        <meshStandardMaterial color={theme.palette.hand} roughness={0.78} />
      </mesh>
    </group>
  )
}

function YarrowBundle({ snapshot, onBegin }: RitualSceneProps) {
  const meshRef = useRef<InstancedMesh>(null)
  const hitRef = useRef<Mesh>(null)
  const currentMatrices = useRef<Matrix4[]>([])
  const targetMatrices = useRef<Matrix4[]>([])
  const tempObject = useRef(new Object3D())
  const tempPosition = useRef(new Vector3())
  const tempQuaternion = useRef(new Quaternion())
  const tempScale = useRef(new Vector3())

  useEffect(() => {
    if (!meshRef.current) return

    const groupColors: Record<YarrowGroup, Color> = {
      center: new Color('#c2aa6a'),
      left: new Color('#c8ad70'),
      right: new Color('#bfa164'),
      takenOne: new Color('#e1bf72'),
      countedLeft: new Color('#897451'),
      countedRight: new Color('#806d4d'),
      remainder: new Color('#e0c27c'),
      removed: new Color('#6c6048'),
    }

    snapshot.stalks.forEach((stalk, index) => {
      tempObject.current.position.set(...stalk.position)
      tempObject.current.rotation.set(...stalk.rotation)
      tempObject.current.scale.setScalar(stalk.group === 'removed' ? 0.88 : 1)
      tempObject.current.updateMatrix()

      const nextMatrix = tempObject.current.matrix.clone()
      targetMatrices.current[index] = nextMatrix

      if (!currentMatrices.current[index]) {
        currentMatrices.current[index] = nextMatrix.clone()
        meshRef.current?.setMatrixAt(index, nextMatrix)
      }

      meshRef.current?.setColorAt(index, groupColors[stalk.group])
    })

    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true
  }, [snapshot.stalks])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const breath = Math.sin(clock.elapsedTime * 1.4) * 0.006

    targetMatrices.current.forEach((target, index) => {
      const current = currentMatrices.current[index] ?? target.clone()
      current.decompose(tempPosition.current, tempQuaternion.current, tempScale.current)

      const targetPosition = new Vector3()
      const targetQuaternion = new Quaternion()
      const targetScale = new Vector3()
      target.decompose(targetPosition, targetQuaternion, targetScale)

      tempPosition.current.lerp(targetPosition, 0.075)
      tempPosition.current.y += breath
      tempQuaternion.current.slerp(targetQuaternion, 0.08)
      tempScale.current.lerp(targetScale, 0.08)

      current.compose(tempPosition.current, tempQuaternion.current, tempScale.current)
      currentMatrices.current[index] = current
      meshRef.current?.setMatrixAt(index, current)
    })

    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <group onClick={onBegin}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, 49]}>
        <cylinderGeometry args={[0.006, 0.008, 1.05, 8]} />
        <meshStandardMaterial roughness={0.65} />
      </instancedMesh>
      <mesh ref={hitRef} position={[0, 0.18, -1.15]}>
        <boxGeometry args={[1.55, 0.55, 1.0]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  )
}

function Table() {
  return (
    <group>
      <mesh position={[0, -0.52, -1.05]} receiveShadow>
        <boxGeometry args={[4.4, 0.22, 2.8]} />
        <meshStandardMaterial color={theme.palette.wood} roughness={0.82} metalness={0.02} />
      </mesh>
      <mesh position={[0, -0.39, -1.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.2, 2.55]} />
        <meshStandardMaterial color={theme.palette.woodTop} roughness={0.9} />
      </mesh>
    </group>
  )
}

function GrassField() {
  const grassRef = useRef<Mesh>(null)

  useFrame(({ clock }) => {
    if (!grassRef.current) return
    grassRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.65) * 0.004
  })

  return (
    <group>
      <mesh ref={grassRef} position={[0, -0.66, -3.05]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[13, 9, 20, 20]} />
        <meshStandardMaterial color={theme.palette.grass} roughness={0.96} />
      </mesh>
      <mesh position={[0, -0.655, -3.05]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[13, 9]} />
        <meshBasicMaterial color={theme.palette.grassDark} transparent opacity={0.16} />
      </mesh>
    </group>
  )
}

function MountainRange() {
  return (
    <group position={[0, -0.22, -5.2]}>
      <mesh position={[-1.9, 0.42, 0]} rotation={[0, 0, 0.02]}>
        <coneGeometry args={[1.65, 1.1, 3]} />
        <meshBasicMaterial color={theme.palette.mountainFar} transparent opacity={0.62} />
      </mesh>
      <mesh position={[0.1, 0.34, -0.06]} rotation={[0, 0, -0.03]}>
        <coneGeometry args={[2.1, 1.25, 3]} />
        <meshBasicMaterial color={theme.palette.mountainNear} transparent opacity={0.68} />
      </mesh>
      <mesh position={[2.1, 0.32, -0.12]} rotation={[0, 0, 0.04]}>
        <coneGeometry args={[1.55, 0.95, 3]} />
        <meshBasicMaterial color={theme.palette.mountainFar} transparent opacity={0.56} />
      </mesh>
      <mesh position={[0, 0.45, 0.08]} rotation={[0, 0, 0]}>
        <planeGeometry args={[7.4, 0.72]} />
        <meshBasicMaterial color={theme.palette.fog} transparent opacity={0.18} />
      </mesh>
    </group>
  )
}

function Stream() {
  const streamRef = useRef<Mesh>(null)

  useFrame(({ clock }) => {
    if (!streamRef.current) return
    streamRef.current.position.z = -2.1 + Math.sin(clock.elapsedTime * 0.7) * 0.018
    streamRef.current.scale.x = 1 + Math.sin(clock.elapsedTime * 1.2) * 0.012
  })

  return (
    <mesh ref={streamRef} position={[2.55, -0.63, -2.1]} rotation={[-Math.PI / 2, 0, -0.24]}>
      <planeGeometry args={[1.15, 4.8, 12, 12]} />
      <meshStandardMaterial color={theme.palette.water} roughness={0.34} metalness={0.05} transparent opacity={0.66} />
    </mesh>
  )
}

function SceneContent(props: RitualSceneProps) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0.55, 1.55]} rotation={[-0.42, 0, 0]} fov={56} />
      <color attach="background" args={[theme.palette.sky]} />
      <fog attach="fog" args={[theme.palette.fog, 3.2, 8.2]} />
      <ambientLight intensity={1.25} color="#d4d2c3" />
      <hemisphereLight args={['#b9c5c7', '#5a654b', 1.65]} />
      <directionalLight position={[-2.8, 3.8, 1.8]} intensity={1.35} color="#f1dfbd" />
      <GrassField />
      <MountainRange />
      <Stream />
      <Table />
      <RobeSleeves />
      <YarrowBundle {...props} />
      <AmbientWarmth />
      <Float speed={0.55} rotationIntensity={0.08} floatIntensity={0.08}>
        <mesh position={[-1.45, 0.18, -1.85]}>
          <torusGeometry args={[0.18, 0.002, 8, 56]} />
          <meshBasicMaterial color="#5d5147" transparent opacity={0.28} />
        </mesh>
      </Float>
      <ContactShadows position={[0, -0.38, -1.1]} opacity={0.26} scale={4.2} blur={2.8} far={1.6} />
      <Environment preset="dawn" />
    </>
  )
}

export function RitualScene(props: RitualSceneProps) {
  return (
    <Canvas shadows dpr={[1, 1.8]} gl={{ antialias: true }}>
      <SceneContent {...props} />
    </Canvas>
  )
}

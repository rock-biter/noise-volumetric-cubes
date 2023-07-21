import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

/**
 * Scene
 */
const scene = new THREE.Scene()

/**
 * Manhattan
 */

const n = 25
const material = new THREE.MeshStandardMaterial({
	color: '#6e4555',
})

const uniforms = {
	uTime: { value: 0 },
}

material.onBeforeCompile = (shader) => {
	console.log('vert:', shader.vertexShader)
	console.log('frag:', shader.fragmentShader)

	shader.uniforms = { ...shader.uniforms, ...uniforms }

	shader.vertexShader = shader.vertexShader.replace(
		'#include <common>',
		`
	#include <common>

	uniform float uTime;

	vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
		vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
		vec3 fade(vec3 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}
		
		float cnoise(vec3 P){
			vec3 Pi0 = floor(P); // Integer part for indexing
			vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1
			Pi0 = mod(Pi0, 289.0);
			Pi1 = mod(Pi1, 289.0);
			vec3 Pf0 = fract(P); // Fractional part for interpolation
			vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
			vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
			vec4 iy = vec4(Pi0.yy, Pi1.yy);
			vec4 iz0 = Pi0.zzzz;
			vec4 iz1 = Pi1.zzzz;
		
			vec4 ixy = permute(permute(ix) + iy);
			vec4 ixy0 = permute(ixy + iz0);
			vec4 ixy1 = permute(ixy + iz1);
		
			vec4 gx0 = ixy0 / 7.0;
			vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
			gx0 = fract(gx0);
			vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
			vec4 sz0 = step(gz0, vec4(0.0));
			gx0 -= sz0 * (step(0.0, gx0) - 0.5);
			gy0 -= sz0 * (step(0.0, gy0) - 0.5);
		
			vec4 gx1 = ixy1 / 7.0;
			vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
			gx1 = fract(gx1);
			vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
			vec4 sz1 = step(gz1, vec4(0.0));
			gx1 -= sz1 * (step(0.0, gx1) - 0.5);
			gy1 -= sz1 * (step(0.0, gy1) - 0.5);
		
			vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
			vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
			vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
			vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
			vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
			vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
			vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
			vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);
		
			vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
			g000 *= norm0.x;
			g010 *= norm0.y;
			g100 *= norm0.z;
			g110 *= norm0.w;
			vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
			g001 *= norm1.x;
			g011 *= norm1.y;
			g101 *= norm1.z;
			g111 *= norm1.w;
		
			float n000 = dot(g000, Pf0);
			float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
			float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
			float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
			float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
			float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
			float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
			float n111 = dot(g111, Pf1);
		
			vec3 fade_xyz = fade(Pf0);
			vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
			vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
			float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
			return 2.2 * n_xyz;
		}
	`
	)

	shader.vertexShader = shader.vertexShader.replace(
		'#include <worldpos_vertex>',
		''
	)

	shader.vertexShader = shader.vertexShader.replace(
		'#include <project_vertex>',
		`
		vec4 meshWPosition = modelMatrix * vec4( vec3(0.), 1.);
		vec4 mvPosition = vec4( transformed, 1.0 );

		mvPosition.xyz *= 1.5;
		mvPosition.xyz = clamp(mvPosition.xyz,vec3(-0.8),vec3(0.8));

	#ifdef USE_INSTANCING

		meshWPosition = instanceMatrix * meshWPosition;
		float noise = cnoise(meshWPosition.xyz * 0.05 + vec3(uTime * 0.1));
		float noise2 = cnoise(meshWPosition.zxy * 0.05 + vec3(uTime * 0.1));
		noise *= noise * 1.5;
		noise2 *= noise2 * 1.5;
		// transformedNormal *= noise;
		mvPosition.xyz *= 1. - smoothstep(0., 0.05, noise );
		mvPosition.xyz *= 1. - smoothstep(0., 0.05, noise2 );
		// mvPosition.xyz *= 1. - smoothstep(17., 20., length(meshWPosition.xyz) );
		mvPosition = instanceMatrix * mvPosition;
		

	#endif

	vec4 worldPosition = modelMatrix * mvPosition;

	mvPosition = viewMatrix * worldPosition;

	gl_Position = projectionMatrix * mvPosition;
	`
	)
}
const geometry = new THREE.SphereGeometry(0.8, 20, 20)
const dummyMat = new THREE.MeshNormalMaterial()

const instMesh = new THREE.InstancedMesh(geometry, material, n * n * n)
instMesh.castShadow = true
instMesh.receiveShadow = true

const mesh = new THREE.Mesh(geometry, material)
let count = 0

for (let i = 0; i < n; i++) {
	for (let j = 0; j < n; j++) {
		for (let k = 0; k < n; k++) {
			// mesh.scale.setScalar(0.99)
			mesh.position
				.set(i * 1.5, j * 1.5, k * 1.5)
				.sub(new THREE.Vector3().setScalar((1.5 * n) / 2))
			mesh.updateMatrix()
			instMesh.setMatrixAt(count, mesh.matrix.clone())
			// scene.add(mesh)

			count++
		}
	}
}

scene.background = new THREE.Color('#220901')

console.log(mesh)

instMesh.instanceMatrix.needsUpdate = true

scene.add(instMesh)

/**
 * render sizes
 */
const sizes = {
	width: window.innerWidth,
	height: window.innerHeight,
}
/**
 * Camera
 */
const fov = 60
const camera = new THREE.PerspectiveCamera(fov, sizes.width / sizes.height, 0.1)
camera.position.setScalar(n * 1.5).x *= -1
camera.lookAt(new THREE.Vector3(0, 2.5, 0))

/**
 * Show the axes of coordinates system
 */
const axesHelper = new THREE.AxesHelper(3)
// scene.add(axesHelper)

// const spotLight = new THREE.SpotLight(0xffffff, 1)

const dirLight = new THREE.DirectionalLight(0xce4257, 2)
dirLight.position.setScalar(40)
dirLight.castShadow = true
dirLight.shadow.mapSize.width = 1024
dirLight.shadow.mapSize.height = 1024
scene.add(dirLight)

dirLight.shadow.camera.far = 110
dirLight.shadow.camera.left = -60
dirLight.shadow.camera.right = 60
dirLight.shadow.camera.top = 60
dirLight.shadow.camera.bottom = -60

const dirLightHelper = new THREE.CameraHelper(dirLight.shadow.camera)
scene.add(dirLightHelper)
dirLightHelper.visible = false

const ambientLight = new THREE.DirectionalLight(0xe8b4bc, 1.2)
scene.add(ambientLight)
// spotLight.castShadow = true
// spotLight.position.set(-30, 40, 10)
// spotLight.lookAt(0, 0, 0)
// spotLight.angle = Math.PI * 0.2
// spotLight.penumbra = 0.9

/**
 * renderer
 */
const renderer = new THREE.WebGLRenderer({
	antialias: window.devicePixelRatio < 2,
	logarithmicDepthBuffer: true,
})
renderer.shadowMap.enabled = true
renderer.shadowMap.needsUpdate = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.shadowMap.autoUpdate = true

document.body.appendChild(renderer.domElement)
handleResize()

/**
 * OrbitControls
 */
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.autoRotate = true

/**
 * Three js Clock
 */
const clock = new THREE.Clock()

/**
 * frame loop
 */
function tic() {
	/**
	 * tempo trascorso dal frame precedente
	 */
	// const deltaTime = clock.getDelta()
	/**
	 * tempo totale trascorso dall'inizio
	 */
	const time = clock.getElapsedTime()

	uniforms.uTime.value = time

	controls.update()

	renderer.render(scene, camera)

	requestAnimationFrame(tic)
}

requestAnimationFrame(tic)

window.addEventListener('resize', handleResize)

function handleResize() {
	sizes.width = window.innerWidth
	sizes.height = window.innerHeight

	camera.aspect = sizes.width / sizes.height
	camera.updateProjectionMatrix()

	renderer.setSize(sizes.width, sizes.height)

	const pixelRatio = Math.min(window.devicePixelRatio, 2)
	renderer.setPixelRatio(pixelRatio)
}

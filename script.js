// Set up the scene, camera, and renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky blue background

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(5, 5, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.getElementById('container').appendChild(renderer.domElement);

// Add orbit controls to move the camera
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Add lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 7);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
scene.add(directionalLight);

// Variables for the dog model and animation
let dog;
let mixer;
let walkAction;
let clock = new THREE.Clock();

// Path to the dog model
const dogModelUrl = 'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/dog/model.gltf';

// Load the dog model
const loader = new THREE.GLTFLoader();
loader.load(
    dogModelUrl,
    function (gltf) {
        const model = gltf.scene;
        // Adjust scale for the dog model
        model.scale.set(1.5, 1.5, 1.5);
        model.traverse(function (object) {
            if (object.isMesh) {
                object.castShadow = true;
            }
        });
        
        dog = model;
        scene.add(dog);
        
        // Set up animation
        mixer = new THREE.AnimationMixer(model);
        if (gltf.animations.length > 0) {
            walkAction = mixer.clipAction(gltf.animations[0]);
            walkAction.play();
        }
        
        // Position the dog
        dog.position.y = 0;
        
        // Apply custom colors to the dog model
        updateDogColors(dog, dogColors);
        
        // Update the UI with the dog's name
        updateDogNameInUI();
    },
    function (xhr) {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function (error) {
        console.error('An error happened', error);
    }
);

// Variables for dog movement
let walkSpeed = 0.12;
let targetPosition = new THREE.Vector3(0, 0, 0);
let mousePosition = new THREE.Vector2();
let isAtTarget = false;

// Add this after the other variable declarations
let dogSound = new Audio('https://cdn.freesound.org/previews/155/155309_60285-lq.mp3');
let canBark = true;

// Replace the hat-related variables with these:
let currentHat = null;
let customHats = {};

// Hat maker variables
let hatMakerScene, hatMakerCamera, hatMakerRenderer, hatMakerControls;
let hatShapes = [];
let selectedShape = null;
let currentHatId = 0;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let dragControls;
let isDragging = false;

// Add this variable to track which hat is being edited
let currentEditingHatId = null;

// Add variables for the wobble animation
let wobbleAmplitude = 0.05; // How high the dog bounces
let wobbleFrequency = 20; // How fast the dog bounces
let wobbleOffset = 0; // Used to track the wobble animation

// Add keyboard movement variables
let keyStates = {
    w: false,
    a: false,
    s: false,
    d: false
};
let keyboardMovementSpeed = 0.08; // Slightly slower than click movement for better control

// Add camera control variables
let cameraKeyStates = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

// Camera control settings
let cameraOrbitSpeed = 0.06; // Doubled from 0.03
let cameraHeightSpeed = 0.15; // Increased from 0.1
let cameraMinHeight = 0.3; // Minimum height (dog's eye level)
let cameraMaxHeight = 15; // Increased from 10
let cameraMinDistance = 0.1; // Minimum distance from dog (almost POV)
let cameraMaxDistance = 15; // Maximum distance from dog
let cameraHeightFactor = 0.2; // How much height changes with up/down
let cameraDistanceFactor = 1.0; // Increased from 0.8 for more dramatic distance change

// Add a variable to store the camera's relative position to the dog
let cameraRelativePosition = new THREE.Vector3(0, 2, 5); // Default camera position relative to dog

// Create a textured ground plane for the main scene
const textureLoader = new THREE.TextureLoader();

// Create a procedural grass-like texture
const canvas = document.createElement('canvas');
canvas.width = 512;
canvas.height = 512;
const context = canvas.getContext('2d');

// Fill with base grass color
context.fillStyle = '#4CAF50';
context.fillRect(0, 0, canvas.width, canvas.height);

// Add some variation to make it look more like grass
for (let i = 0; i < 5000; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const size = 1 + Math.random() * 2;
    
    // Vary the green shades
    const r = 50 + Math.random() * 30;
    const g = 150 + Math.random() * 50;
    const b = 30 + Math.random() * 40;
    
    context.fillStyle = `rgb(${r}, ${g}, ${b})`;
    context.fillRect(x, y, size, size + Math.random() * 3);
}

// Create texture from canvas
const groundTexture = new THREE.CanvasTexture(canvas);
groundTexture.wrapS = THREE.RepeatWrapping;
groundTexture.wrapT = THREE.RepeatWrapping;
groundTexture.repeat.set(50, 50);
groundTexture.anisotropy = 16;

// Create a larger ground plane for "infinite" effect
const groundSize = 1000;
const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize);
const groundMaterial = new THREE.MeshStandardMaterial({ 
    map: groundTexture,
    roughness: 0.9,
    metalness: 0.1
});

const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
ground.receiveShadow = true;
scene.add(ground);

// Create the giant tree
const giantTree = createGiantTree();

// Add this after the ground creation code but before the animation setup
// Create a giant tree in the middle of the map
function createGiantTree() {
    // Create the tree trunk
    const trunkGeometry = new THREE.CylinderGeometry(2, 2.5, 15, 16);
    const trunkMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513, // Brown color for trunk
        roughness: 0.9,
        metalness: 0.1
    });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    // Offset the tree position so the dog doesn't spawn inside it
    trunk.position.set(-15, 7.5, -15); // Moved to -15, 7.5, -15 instead of 0, 7.5, 0
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    scene.add(trunk);
    
    // Create the tree foliage (multiple layers for a more interesting look)
    const foliageMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2E8B57, // Sea green color for leaves
        roughness: 0.8,
        metalness: 0.1
    });
    
    // Bottom layer (largest)
    const foliageGeometry1 = new THREE.ConeGeometry(10, 12, 16);
    const foliage1 = new THREE.Mesh(foliageGeometry1, foliageMaterial);
    foliage1.position.set(-15, 12, -15); // Updated position to match trunk
    foliage1.castShadow = true;
    scene.add(foliage1);
    
    // Middle layer
    const foliageGeometry2 = new THREE.ConeGeometry(8, 10, 16);
    const foliage2 = new THREE.Mesh(foliageGeometry2, foliageMaterial);
    foliage2.position.set(-15, 16, -15); // Updated position to match trunk
    foliage2.castShadow = true;
    scene.add(foliage2);
    
    // Top layer (smallest)
    const foliageGeometry3 = new THREE.ConeGeometry(5, 8, 16);
    const foliage3 = new THREE.Mesh(foliageGeometry3, foliageMaterial);
    foliage3.position.set(-15, 20, -15); // Updated position to match trunk
    foliage3.castShadow = true;
    scene.add(foliage3);
    
    // Add some random small branches to make the tree more interesting
    for (let i = 0; i < 12; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 1.8 + Math.random() * 0.5;
        const height = 5 + Math.random() * 10;
        
        const branchGeometry = new THREE.CylinderGeometry(0.2, 0.3, 3 + Math.random() * 2, 8);
        const branch = new THREE.Mesh(branchGeometry, trunkMaterial);
        
        // Position around the trunk (adjusted for new trunk position)
        branch.position.x = -15 + Math.cos(angle) * radius;
        branch.position.y = height;
        branch.position.z = -15 + Math.sin(angle) * radius;
        
        // Rotate to point outward from trunk
        branch.rotation.z = Math.PI / 2 - angle;
        branch.rotation.y = Math.random() * Math.PI / 4;
        
        branch.castShadow = true;
        scene.add(branch);
    }
    
    // Return the tree parts as a group
    return { trunk, foliage1, foliage2, foliage3 };
}

// Initialize the hat maker
function initHatMaker() {
    console.log('Initializing hat maker');
    // Create a new scene for the hat maker
    hatMakerScene = new THREE.Scene();
    hatMakerScene.background = new THREE.Color(0xf0f0f0);
    
    // Set up camera - position it higher to focus on the hat
    hatMakerCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    hatMakerCamera.position.set(0, 2.5, 3); // Increased Y position to 2.5 to look at top of head
    
    // Set up renderer
    const container = document.getElementById('hat-preview-container');
    
    // Clear any existing renderer
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    console.log('Hat maker container size:', width, 'x', height);
    
    hatMakerRenderer = new THREE.WebGLRenderer({ antialias: true });
    hatMakerRenderer.setSize(width, height);
    hatMakerRenderer.shadowMap.enabled = true;
    container.appendChild(hatMakerRenderer.domElement);
    
    // Add orbit controls - target the top of the dog's head
    hatMakerControls = new THREE.OrbitControls(hatMakerCamera, hatMakerRenderer.domElement);
    hatMakerControls.enableDamping = true;
    hatMakerControls.dampingFactor = 0.05;
    hatMakerControls.target.set(0, 1.2, 0); // Increased Y target to 1.2 for top of head
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    hatMakerScene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    hatMakerScene.add(directionalLight);
    
    // Add a transparent dog model
    addTransparentDogToHatMaker();
    
    // Set up drag controls
    setupDragControls();
    
    // Set up event listeners for the hat maker
    setupHatMakerEvents(container);
    
    // Start animation loop
    animateHatMaker();
    
    // Ensure initial render
    hatMakerRenderer.render(hatMakerScene, hatMakerCamera);
    
    console.log('Hat maker initialized');
}

// Set up drag controls for the hat maker
function setupDragControls() {
    const objects = [];
    hatShapes.forEach(shape => objects.push(shape.mesh));
    
    dragControls = new THREE.DragControls(objects, hatMakerCamera, hatMakerRenderer.domElement);
    
    dragControls.addEventListener('dragstart', function(event) {
        isDragging = true;
        hatMakerControls.enabled = false;
        
        // Find the shape being dragged
        const draggedMesh = event.object;
        const shapeInfo = hatShapes.find(shape => shape.mesh === draggedMesh);
        
        if (shapeInfo) {
            selectShape(hatShapes.indexOf(shapeInfo));
        }
    });
    
    dragControls.addEventListener('drag', function(event) {
        if (selectedShape) {
            // Update position in the UI
            document.getElementById('pos-x').value = event.object.position.x.toFixed(1);
            document.getElementById('pos-y').value = event.object.position.y.toFixed(1);
            document.getElementById('pos-z').value = event.object.position.z.toFixed(1);
            
            document.getElementById('pos-x-value').textContent = event.object.position.x.toFixed(1);
            document.getElementById('pos-y-value').textContent = event.object.position.y.toFixed(1);
            document.getElementById('pos-z-value').textContent = event.object.position.z.toFixed(1);
            
            // Update the shape info
            selectedShape.position.x = event.object.position.x;
            selectedShape.position.y = event.object.position.y;
            selectedShape.position.z = event.object.position.z;
        }
    });
    
    dragControls.addEventListener('dragend', function() {
        isDragging = false;
        hatMakerControls.enabled = true;
    });
}

// Set up event listeners for the hat maker
function setupHatMakerEvents(container) {
    // Mouse click for selecting shapes
    container.addEventListener('mousedown', function(event) {
        if (isDragging) return;
        
        // Calculate mouse position relative to the container
        const rect = container.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;
        
        raycaster.setFromCamera(mouse, hatMakerCamera);
        
        // Get all meshes from shapes
        const meshes = hatShapes.map(shape => shape.mesh);
        const intersects = raycaster.intersectObjects(meshes);
        
        if (intersects.length > 0) {
            // Find the shape that was clicked
            const clickedMesh = intersects[0].object;
            const shapeInfo = hatShapes.find(shape => shape.mesh === clickedMesh);
            
            if (shapeInfo) {
                selectShape(hatShapes.indexOf(shapeInfo));
            }
        } else {
            // Clicked on empty space, deselect
            selectedShape = null;
            updateShapeList();
        }
    });
}

// Function to add a shape to the hat
function addShape(shapeType) {
    console.log(`Adding shape: ${shapeType}`);
    
    if (!shapeDefinitions[shapeType]) {
        console.error('Unknown shape type:', shapeType);
        return;
    }
    
    const color = document.getElementById('shape-color').value;
    
    // Get default dimensions
    const dimensions = getDefaultDimensions(shapeType);
    
    // Create geometry based on shape type
    const geometry = createGeometryWithDimensions(shapeType, dimensions);
    
    if (!geometry) {
        console.error('Failed to create geometry for shape type:', shapeType);
        return;
    }
    
    // Create material and mesh
    const material = new THREE.MeshStandardMaterial({ 
        color: color,
        metalness: 0.3,
        roughness: 0.7
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    
    // Set initial position - match the exact position used in the game
    const posX = 0;
    const posY = 1.2; // Position it at the top of the dog's head
    const posZ = 0;
    mesh.position.set(posX, posY, posZ);
    
    // Set fixed scale - no longer user adjustable
    const defaultScale = 1.0;
    mesh.scale.set(defaultScale, defaultScale, defaultScale);
    
    // Set neutral rotation
    const rotX = 0;
    const rotY = 0;
    const rotZ = 0;
    
    mesh.rotation.set(rotX, rotY, rotZ);
    
    // Make sure the shape casts shadows
    mesh.castShadow = true;
    
    // Add to scene
    hatMakerScene.add(mesh);
    
    // Create shape info object
    const shapeInfo = {
        id: Date.now(),
        type: shapeType,
        mesh: mesh,
        color: color,
        position: { x: posX, y: posY, z: posZ },
        rotation: { x: rotX, y: rotY, z: rotZ },
        dimensions: dimensions
    };
    
    // Add to shapes array
    hatShapes.push(shapeInfo);
    
    // Update the shape list
    updateShapeList();
    
    // Select the new shape
    selectShape(hatShapes.length - 1);
    
    // Update drag controls
    setupDragControls();
    
    console.log(`Shape added: ${shapeType}`, shapeInfo);
    return shapeInfo;
}

// Define shape configurations once
const shapeDefinitions = {
    'cone': {
        createGeometry: (dims) => new THREE.ConeGeometry(dims.radius, dims.height, dims.segments),
        defaultDimensions: { radius: 0.5, height: 1, segments: 32 },
        controls: ['radius', 'height']
    },
    'cylinder': {
        createGeometry: (dims) => new THREE.CylinderGeometry(dims.radius, dims.radius, dims.height, dims.segments),
        defaultDimensions: { radius: 0.5, height: 1, segments: 32 },
        controls: ['radius', 'height']
    },
    'sphere': {
        createGeometry: (dims) => new THREE.SphereGeometry(dims.radius, dims.widthSegments, dims.heightSegments),
        defaultDimensions: { radius: 0.5, widthSegments: 32, heightSegments: 32 },
        controls: ['radius']
    },
    'box': {
        createGeometry: (dims) => new THREE.BoxGeometry(dims.width, dims.height, dims.depth),
        defaultDimensions: { width: 1, height: 1, depth: 1 },
        controls: ['width', 'height', 'depth']
    },
    'torus': {
        createGeometry: (dims) => new THREE.TorusGeometry(dims.radius, dims.tube, dims.radialSegments, dims.tubularSegments),
        defaultDimensions: { radius: 0.5, tube: 0.2, radialSegments: 16, tubularSegments: 32 },
        controls: ['radius', 'tube']
    },
    'pyramid': {
        createGeometry: (dims) => new THREE.ConeGeometry(dims.radius, dims.height, 4),
        defaultDimensions: { radius: 0.5, height: 1 },
        controls: ['radius', 'height']
    },
    'ring': {
        createGeometry: (dims) => new THREE.TorusGeometry(dims.radius, 0.1, dims.radialSegments, dims.tubularSegments),
        defaultDimensions: { radius: 0.5, radialSegments: 16, tubularSegments: 32 },
        controls: ['radius']
    },
    'star': {
        createGeometry: (dims) => createStarGeometry(dims.outerRadius, dims.innerRadius, dims.points),
        defaultDimensions: { outerRadius: 0.5, innerRadius: 0.2, points: 5 },
        controls: ['outerRadius', 'innerRadius', 'points']
    },
    'heart': {
        createGeometry: (dims) => createHeartGeometry(dims.size),
        defaultDimensions: { size: 0.5 },
        controls: ['size']
    }
};

// Use the definitions
function createGeometryWithDimensions(shapeType, dimensions) {
    const definition = shapeDefinitions[shapeType];
    if (!definition) return null;
    
    return definition.createGeometry(dimensions);
}

function getDefaultDimensions(shapeType) {
    return shapeDefinitions[shapeType]?.defaultDimensions || {};
}

// Function to update a shape's dimensions
function updateShapeDimensions(shapeInfo, newDimensions) {
    if (!shapeInfo || !shapeInfo.mesh) return;
    
    // Create new geometry with updated dimensions
    const newGeometry = createGeometryWithDimensions(shapeInfo.type, newDimensions);
    if (!newGeometry) return;
    
    // Store the old position, rotation, and scale
    const position = shapeInfo.mesh.position.clone();
    const rotation = shapeInfo.mesh.rotation.clone();
    const scale = shapeInfo.mesh.scale.clone();
    
    // Remove the old mesh from the scene
    hatMakerScene.remove(shapeInfo.mesh);
    
    // Create a new mesh with the new geometry and the same material
    const newMesh = new THREE.Mesh(newGeometry, shapeInfo.mesh.material);
    
    // Restore position, rotation, and scale
    newMesh.position.copy(position);
    newMesh.rotation.copy(rotation);
    newMesh.scale.copy(scale);
    
    // Make sure the shape casts shadows
    newMesh.castShadow = true;
    
    // Add to scene
    hatMakerScene.add(newMesh);
    
    // Update the shape info
    shapeInfo.mesh = newMesh;
    shapeInfo.dimensions = newDimensions;
    
    // Update drag controls
    setupDragControls();
}

// Function to create dimension sliders for a shape
function createDimensionSliders(shapeInfo) {
    const container = document.getElementById('dimension-sliders');
    container.innerHTML = '';
    
    if (!shapeInfo) return;
    
    const definition = shapeDefinitions[shapeInfo.type];
    if (!definition) return;
    
    const dimensions = shapeInfo.dimensions;
    
    definition.controls.forEach(controlName => {
        // Create slider for each control...
    });
}

// Function to select a shape
function selectShape(index) {
    // Deselect all shapes first
    hatShapes.forEach((shape, i) => {
        if (shape.mesh.material) {
            shape.mesh.material.emissive = new THREE.Color(0x000000);
        }
        
        const listItem = document.querySelector(`#shape-list li[data-index="${i}"]`);
        if (listItem) {
            listItem.classList.remove('selected');
        }
    });
    
    // Select the new shape
    if (index >= 0 && index < hatShapes.length) {
        selectedShape = hatShapes[index];
        
        // Highlight the selected shape
        if (selectedShape.mesh.material) {
            selectedShape.mesh.material.emissive = new THREE.Color(0x333333);
        }
        
        // Update UI controls to match the selected shape
        document.getElementById('shape-color').value = selectedShape.color;
        
        // Create dimension sliders for the selected shape
        createDimensionSliders(selectedShape);
        
        // Highlight the list item
        const listItem = document.querySelector(`#shape-list li[data-index="${index}"]`);
        if (listItem) {
            listItem.classList.add('selected');
        }
    } else {
        selectedShape = null;
    }
    
    // Dispatch a custom event to update the rotation control
    document.dispatchEvent(new CustomEvent('shape-selected'));
}

// Function to update the shape list in the UI
function updateShapeList() {
    const shapeList = document.getElementById('shape-list');
    shapeList.innerHTML = '';
    
    hatShapes.forEach((shape, index) => {
        const listItem = document.createElement('li');
        listItem.textContent = `${shape.type} (${shape.color})`;
        listItem.dataset.index = index;
        
        if (selectedShape === shape) {
            listItem.classList.add('selected');
        }
        
        listItem.addEventListener('click', function() {
            selectShape(index);
        });
        
        shapeList.appendChild(listItem);
    });
}

// Function to update the selected shape based on UI controls
function updateSelectedShape() {
    if (!selectedShape) return;
    
    // Get values from UI
    const color = document.getElementById('shape-color').value;
    const rotX = parseFloat(document.getElementById('rot-x').value);
    const rotY = parseFloat(document.getElementById('rot-y').value);
    const rotZ = parseFloat(document.getElementById('rot-z').value);
    
    // Update the shape
    selectedShape.color = color;
    selectedShape.rotation = { x: rotX, y: rotY, z: rotZ };
    
    // Update the mesh
    selectedShape.mesh.rotation.set(rotX, rotY, rotZ);
    selectedShape.mesh.material.color.set(color);
}

// Function to delete the selected shape
function deleteSelectedShape() {
    if (!selectedShape) return;
    
    // Remove from scene
    hatMakerScene.remove(selectedShape.mesh);
    
    // Remove from array
    const index = hatShapes.indexOf(selectedShape);
    if (index > -1) {
        hatShapes.splice(index, 1);
    }
    
    // Clear selection
    selectedShape = null;
    
    // Update UI
    updateShapeList();
    
    // Update drag controls
    setupDragControls();
}

// Function to clear all shapes
function clearAllShapes() {
    // Remove all shapes from scene
    hatShapes.forEach(shape => {
        hatMakerScene.remove(shape.mesh);
    });
    
    // Clear array
    hatShapes = [];
    
    // Clear selection
    selectedShape = null;
    
    // Update UI
    updateShapeList();
    
    // Update drag controls
    setupDragControls();
}

// Function to save the hat
function saveHat() {
    if (hatShapes.length === 0) {
        alert('Please add at least one shape to your hat before saving.');
        return;
    }
    
    // Update the title based on whether we're editing or creating
    const saveTitle = document.getElementById('save-hat-title');
    if (currentEditingHatId) {
        saveTitle.textContent = 'Edit Hat';
    } else {
        saveTitle.textContent = 'Save Your Hat';
    }
    
    // Show the save modal
    document.getElementById('save-hat-modal').style.display = 'block';
}

// Function to edit an existing hat
function editCustomHat(hatId) {
    console.log(`Editing hat: ${hatId}`);
    
    // Get the custom hat
    const customHat = customHats[hatId];
    if (!customHat) {
        console.warn(`Cannot find hat with ID: ${hatId}`);
        return;
    }
    
    // Clear current shapes
    clearAllShapes();
    
    // Clone each shape from the hat group and add to the hat maker
    customHat.group.children.forEach(child => {
        // Determine the shape type
        const shapeType = getShapeType(child.geometry);
        
        // Get dimensions from the geometry
        const dimensions = extractDimensionsFromGeometry(child.geometry, shapeType);
        
        // Create a new geometry based on the shape type and dimensions
        const geometry = createGeometryWithDimensions(shapeType, dimensions);
        
        // Create material
        const material = child.material.clone();
        
        // Create mesh
        const mesh = new THREE.Mesh(geometry, material);
        
        // Copy position, rotation, and scale
        mesh.position.copy(child.position);
        mesh.rotation.copy(child.rotation);
        mesh.scale.copy(child.scale);
        
        // Add to scene
        hatMakerScene.add(mesh);
        
        // Create shape info
        const shapeInfo = {
            id: Date.now() + Math.random(),
            type: shapeType,
            mesh: mesh,
            color: '#' + material.color.getHexString(),
            position: { 
                x: mesh.position.x, 
                y: mesh.position.y, 
                z: mesh.position.z 
            },
            rotation: { 
                x: mesh.rotation.x, 
                y: mesh.rotation.y, 
                z: mesh.rotation.z 
            },
            dimensions: dimensions
        };
        
        // Add to shapes array
        hatShapes.push(shapeInfo);
    });
    
    // Update UI
    updateShapeList();
    
    // Set the hat name in the save dialog
    document.getElementById('hat-name').value = customHat.name;
    
    // Open the hat maker modal
    document.getElementById('hat-maker-modal').style.display = 'block';
    
    // Force resize and render of the hat maker preview
    setTimeout(function() {
        resizeHatMakerPreview();
        hatMakerRenderer.render(hatMakerScene, hatMakerCamera);
    }, 100);
    
    // Store the hat ID being edited
    currentEditingHatId = hatId;
    
    // Update drag controls with the new shapes
    setupDragControls();
    
    console.log('Hat loaded for editing');
}

// Function to extract dimensions from a geometry
function extractDimensionsFromGeometry(geometry, shapeType) {
    const defaultDimensions = getDefaultDimensions(shapeType);
    
    if (!geometry.parameters) return defaultDimensions;
    
    switch(shapeType) {
        case 'cone':
        case 'pyramid':
            return {
                radius: geometry.parameters.radius || defaultDimensions.radius,
                height: geometry.parameters.height || defaultDimensions.height,
                segments: geometry.parameters.radialSegments || defaultDimensions.segments
            };
        case 'cylinder':
            return {
                radius: geometry.parameters.radiusTop || defaultDimensions.radius,
                height: geometry.parameters.height || defaultDimensions.height,
                segments: geometry.parameters.radialSegments || defaultDimensions.segments
            };
        case 'sphere':
            return {
                radius: geometry.parameters.radius || defaultDimensions.radius,
                widthSegments: geometry.parameters.widthSegments || defaultDimensions.widthSegments,
                heightSegments: geometry.parameters.heightSegments || defaultDimensions.heightSegments
            };
        case 'box':
            return {
                width: geometry.parameters.width || defaultDimensions.width,
                height: geometry.parameters.height || defaultDimensions.height,
                depth: geometry.parameters.depth || defaultDimensions.depth
            };
        case 'ring':
            return {
                radius: geometry.parameters.radius || defaultDimensions.radius,
                tube: geometry.parameters.tube || defaultDimensions.tube,
                radialSegments: geometry.parameters.radialSegments || defaultDimensions.radialSegments,
                tubularSegments: geometry.parameters.tubularSegments || defaultDimensions.tubularSegments
            };
        default:
            return defaultDimensions;
    }
}

// Function to create a star geometry
function createStarGeometry(outerRadius, innerRadius, points) {
    const shape = new THREE.Shape();
    
    const angleStep = Math.PI / points;
    
    // Start at the top
    shape.moveTo(0, outerRadius);
    
    // Draw the star points
    for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? innerRadius : outerRadius;
        const angle = angleStep * (i + 1);
        shape.lineTo(Math.sin(angle) * radius, Math.cos(angle) * radius);
    }
    
    const extrudeSettings = {
        steps: 1,
        depth: 0.2,
        bevelEnabled: true,
        bevelThickness: 0.1,
        bevelSize: 0.1,
        bevelSegments: 3
    };
    
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}

// Function to create a heart geometry
function createHeartGeometry(size) {
    const shape = new THREE.Shape();
    
    // Draw half of the heart
    shape.moveTo(0, size * 0.5);
    shape.bezierCurveTo(
        size * 0.5, size * 0.5,
        size * 0.5, size * -0.5,
        0, size * -1
    );
    
    // Draw the other half
    shape.bezierCurveTo(
        size * -0.5, size * -0.5,
        size * -0.5, size * 0.5,
        0, size * 0.5
    );
    
    const extrudeSettings = {
        steps: 1,
        depth: 0.2,
        bevelEnabled: true,
        bevelThickness: 0.1,
        bevelSize: 0.1,
        bevelSegments: 3
    };
    
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}

// Function to create a top hat geometry
function createTopHatGeometry() {
    const group = new THREE.Group();
    
    // Create the brim
    const brimGeometry = new THREE.CylinderGeometry(0.7, 0.7, 0.1, 32);
    const brimMesh = new THREE.Mesh(brimGeometry);
    brimMesh.position.y = -0.45;
    
    // Create the top part
    const topGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.8, 32);
    const topMesh = new THREE.Mesh(topGeometry);
    topMesh.position.y = 0;
    
    // Combine into a single geometry
    const hatGeometry = new THREE.BufferGeometry();
    
    // Convert to buffer geometry and merge
    brimMesh.updateMatrix();
    topMesh.updateMatrix();
    
    const brimBufferGeometry = brimGeometry.clone().applyMatrix4(brimMesh.matrix);
    const topBufferGeometry = topGeometry.clone().applyMatrix4(topMesh.matrix);
    
    // Merge geometries
    const geometries = [brimBufferGeometry, topBufferGeometry];
    return THREE.BufferGeometryUtils.mergeBufferGeometries(geometries);
}

// Update the getShapeType function to handle the new shapes
function getShapeType(geometry) {
    if (!geometry) return 'unknown';
    
    const type = geometry.type;
    
    if (type.includes('Cone')) {
        // Check if it's a pyramid (cone with 4 segments)
        if (geometry.parameters && geometry.parameters.radialSegments === 4) {
            return 'pyramid';
        }
        return 'cone';
    }
    if (type.includes('Cylinder')) return 'cylinder';
    if (type.includes('Sphere')) return 'sphere';
    if (type.includes('Box')) return 'box';
    if (type.includes('Torus')) {
        // Check if it's a ring (thin torus)
        if (geometry.parameters && geometry.parameters.tube < 0.15) {
            return 'ring';
        }
        return 'torus';
    }
    if (type.includes('Extrude')) {
        // Try to determine if it's a star or heart based on vertex count
        const vertexCount = geometry.attributes.position.count;
        if (vertexCount > 100 && vertexCount < 200) {
            return 'star';
        } else if (vertexCount > 200) {
            return 'heart';
        }
    }
    if (type.includes('BufferGeometry') && geometry.userData && geometry.userData.mergedGeometries) {
        return 'tophat';
    }
    
    // For loaded shapes, check the geometry parameters
    if (geometry.parameters) {
        if (geometry.parameters.radiusTop !== undefined && 
            geometry.parameters.radiusTop !== geometry.parameters.radiusBottom) return 'cone';
        if (geometry.parameters.radiusTop !== undefined) return 'cylinder';
        if (geometry.parameters.radius !== undefined && geometry.parameters.phi !== undefined) return 'sphere';
        if (geometry.parameters.width !== undefined) return 'box';
        if (geometry.parameters.tube !== undefined) return 'torus';
    }
    
    return 'unknown';
}

// Update the confirmSaveHat function to save to localStorage
function confirmSaveHat() {
    const hatName = document.getElementById('hat-name').value || `Custom Hat ${currentHatId + 1}`;
    
    // Create a group to hold all the shapes
    const hatGroup = new THREE.Group();
    
    // Clone all shapes and add them to the group
    hatShapes.forEach(shape => {
        const clonedMesh = shape.mesh.clone();
        hatGroup.add(clonedMesh);
    });
    
    let hatId;
    
    // If we're editing an existing hat, update it
    if (currentEditingHatId) {
        hatId = currentEditingHatId;
        
        // Update the existing hat
        customHats[hatId] = {
            name: hatName,
            group: hatGroup
        };
        
        // Update the button text
        const button = document.querySelector(`.hat-btn[data-hat="${hatId}"]`);
        if (button) {
            button.textContent = hatName;
        }
        
        // Reset the editing state
        currentEditingHatId = null;
    } else {
        // Create a new hat
        hatId = `custom-${currentHatId++}`;
        customHats[hatId] = {
            name: hatName,
            group: hatGroup
        };
        
        // Add to the selector
        addHatToSelector(hatId, hatName);
    }
    
    // Close the save modal
    document.getElementById('save-hat-modal').style.display = 'none';
    document.getElementById('hat-name').value = '';
    
    // Close the hat maker modal
    document.getElementById('hat-maker-modal').style.display = 'none';
    
    // Apply the new hat
    attachCustomHat(hatId);
    
    // Save all hats to localStorage
    saveHatsToLocalStorage();
}

// Update the addHatToSelector function to add edit button
function addHatToSelector(hatId, hatName) {
    const container = document.getElementById('saved-hats-container');
    
    // Create a container for the hat button and edit button
    const hatButtonContainer = document.createElement('div');
    hatButtonContainer.className = 'hat-button-container';
    
    // Create the hat button
    const button = document.createElement('button');
    button.className = 'hat-btn saved-hat-btn';
    button.textContent = hatName;
    button.setAttribute('data-hat', hatId);
    
    button.addEventListener('click', function() {
        attachCustomHat(hatId);
    });
    
    // Create the edit button
    const editButton = document.createElement('button');
    editButton.className = 'edit-hat-btn';
    editButton.innerHTML = '✏️'; // Pencil emoji
    editButton.setAttribute('data-hat', hatId);
    editButton.title = 'Edit hat';
    
    editButton.addEventListener('click', function() {
        editCustomHat(hatId);
    });
    
    // Add buttons to container
    hatButtonContainer.appendChild(button);
    hatButtonContainer.appendChild(editButton);
    
    // Add container to the saved hats section
    container.appendChild(hatButtonContainer);
}

// Update the attachCustomHat function to fix the position
function attachCustomHat(hatId) {
    console.log(`Attaching custom hat: ${hatId}`);
    
    // Remove current hat if there is one
    removeHat();
    
    // Get the custom hat
    const customHat = customHats[hatId];
    if (!customHat) {
        console.warn(`Cannot find hat with ID: ${hatId}`);
        return;
    }
    
    // Clone the hat group
    currentHat = customHat.group.clone();
    
    // Scale down the hat to make it smaller
    currentHat.scale.set(0.6, 0.6, 0.6);
    
    // Add the hat as a child of the dog
    dog.add(currentHat);
    
    // Position the hat on the dog's head
    // Fine-tune the Y position to get it just right
    currentHat.position.set(0, 0.15, 0); // Reduced from 0.2 to 0.15
    
    // Update active button styling
    document.querySelectorAll('.hat-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.querySelector(`.hat-btn[data-hat="${hatId}"]`).classList.add('active');
}

// Function to remove the current hat
function removeHat() {
    if (currentHat && currentHat.parent) {
        currentHat.parent.remove(currentHat);
        currentHat = null;
    }
    
    // Update active button styling
    document.querySelectorAll('.hat-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.querySelector('.hat-btn[data-hat="none"]').classList.add('active');
}

// Update the event listeners section
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the hat maker
    initHatMaker();
    
    // Load saved hats from localStorage
    loadHatsFromLocalStorage();
    
    // Add direct event listeners to shape buttons
    const shapeButtons = document.querySelectorAll('.shape-btn[data-shape]');
    console.log('Shape buttons found:', shapeButtons.length);
    
    shapeButtons.forEach(button => {
        button.addEventListener('click', function(event) {
            const shapeType = this.getAttribute('data-shape');
            console.log('Shape button clicked:', shapeType);
            
            if (shapeType && shapeType !== 'none') {
                event.preventDefault();
                event.stopPropagation();
                addShape(shapeType);
            }
        });
    });
    
    // Open hat maker modal without password check
    document.getElementById('open-hat-maker').addEventListener('click', function() {
        openHatMaker(); // Directly open the hat maker without password check
    });
    
    // Close hat maker modal
    document.querySelector('.close-modal').addEventListener('click', function() {
        document.getElementById('hat-maker-modal').style.display = 'none';
    });
    
    // Close save hat modal
    document.querySelector('.close-save-modal').addEventListener('click', function() {
        document.getElementById('save-hat-modal').style.display = 'none';
    });
    
    // Delete selected shape
    document.getElementById('delete-selected').addEventListener('click', deleteSelectedShape);
    
    // Clear all shapes
    document.getElementById('clear-hat').addEventListener('click', clearAllShapes);
    
    // Save hat
    document.getElementById('save-hat').addEventListener('click', saveHat);
    
    // Confirm save
    document.getElementById('confirm-save').addEventListener('click', confirmSaveHat);
    
    // No hat button
    document.querySelector('.hat-btn[data-hat="none"]').addEventListener('click', removeHat);
    
    // Update shape when controls change
    const controls = ['shape-color', 'rot-x', 'rot-y', 'rot-z'];
    controls.forEach(controlId => {
        const control = document.getElementById(controlId);
        control.addEventListener('input', function() {
            // Update displayed value
            const valueDisplay = document.getElementById(`${controlId}-value`);
            if (valueDisplay) {
                valueDisplay.textContent = this.value;
            }
            
            updateSelectedShape();
        });
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        const hatMakerModal = document.getElementById('hat-maker-modal');
        const saveHatModal = document.getElementById('save-hat-modal');
        
        if (event.target === hatMakerModal) {
            hatMakerModal.style.display = 'none';
        }
        
        if (event.target === saveHatModal) {
            saveHatModal.style.display = 'none';
        }
    });
});

// Handle mouse movement
window.addEventListener('mousemove', function(event) {
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
    mousePosition.y = - (event.clientY / window.innerHeight) * 2 + 1;
});

// Handle mouse clicks
window.addEventListener('click', function(event) {
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    const clickPosition = new THREE.Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
    );
    
    // Create a raycaster
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(clickPosition, camera);
    
    // Check if any modal is open - if so, don't allow barking
    const hatMakerModalOpen = document.getElementById('hat-maker-modal').style.display === 'block';
    const saveHatModalOpen = document.getElementById('save-hat-modal').style.display === 'block';
    const petCustomizationModalOpen = document.getElementById('pet-customization-modal') && 
                                     document.getElementById('pet-customization-modal').style.display === 'block';
    const dogCustomizationModalOpen = document.getElementById('dog-customization-modal').style.display === 'block';
    
    // If any modal is open, don't process the bark
    if (hatMakerModalOpen || saveHatModalOpen || petCustomizationModalOpen || dogCustomizationModalOpen) {
        return;
    }
    
    // Check if the dog was clicked
    if (dog) {
        const dogParts = [];
        dog.traverse(function(object) {
            if (object.isMesh) {
                dogParts.push(object);
            }
        });
        
        const intersects = raycaster.intersectObjects(dogParts);
        
        if (intersects.length > 0 && canBark) {
            // Dog was clicked, make it bark
            dogSound.currentTime = 0;
            dogSound.play();
            
            // Add a simple animation for barking
            if (dog) {
                // Prevent multiple barks in quick succession
                canBark = false;
                
                // Visual feedback - make the dog "bounce" slightly
                const originalY = dog.position.y;
                const jumpHeight = 0.3;
                const jumpDuration = 300; // ms
                
                // Jump up
                const jumpUp = gsap.to(dog.position, {
                    y: originalY + jumpHeight,
                    duration: jumpDuration / 2000,
                    ease: "power1.out",
                    onComplete: function() {
                        // Jump down
                        gsap.to(dog.position, {
                            y: originalY,
                            duration: jumpDuration / 2000,
                            ease: "power1.in",
                            onComplete: function() {
                                // Allow barking again after a short delay
                                setTimeout(function() {
                                    canBark = true;
                                }, 500);
                            }
                        });
                    }
                });
            }
        }
    }
});

// Function to calculate where on the ground the mouse is pointing
function getMousePositionOnGround() {
    // Create a raycaster
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mousePosition, camera);
    
    // Check for intersection with the ground
    const intersects = raycaster.intersectObject(ground);
    
    if (intersects.length > 0) {
        return intersects[0].point;
    }
    
    return null;
}

// Function to make the dog look at the camera
function makeDogLookAtCamera() {
    if (!dog) return;
    
    // Get direction to camera
    const directionToCamera = new THREE.Vector3();
    directionToCamera.subVectors(camera.position, dog.position);
    directionToCamera.y = 0; // Keep the dog looking horizontally
    
    // Calculate the rotation
    const targetRotation = Math.atan2(directionToCamera.x, directionToCamera.z);
    
    // Apply rotation
    dog.rotation.y = targetRotation;
}

// Handle window resize
window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Separate animation concerns
function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    
    // Update the animation mixer
    if (mixer) {
        mixer.update(delta);
    }
    
    // Handle keyboard movement
    let keyboardMovement = false;
    let movementDirection = new THREE.Vector3(0, 0, 0);
    
    // Get camera forward direction (projected onto XZ plane)
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0; // Project onto XZ plane
    cameraDirection.normalize();
    
    // Calculate camera right direction (perpendicular to forward on XZ plane)
    const cameraRight = new THREE.Vector3(-cameraDirection.z, 0, cameraDirection.x);
    
    // Apply movement based on key states
    if (keyStates.w) {
        // Forward - in the direction the camera is looking
        movementDirection.add(cameraDirection);
        keyboardMovement = true;
    }
    if (keyStates.s) {
        // Backward - opposite to the direction the camera is looking
        movementDirection.sub(cameraDirection);
        keyboardMovement = true;
    }
    if (keyStates.a) {
        // Left - perpendicular to camera direction
        movementDirection.sub(cameraRight);
        keyboardMovement = true;
    }
    if (keyStates.d) {
        // Right - perpendicular to camera direction
        movementDirection.add(cameraRight);
        keyboardMovement = true;
    }
    
    // Store the dog's previous position to calculate movement
    const dogPreviousPosition = dog ? dog.position.clone() : new THREE.Vector3(0, 0, 0);
    
    if (keyboardMovement && dog) {
        // Normalize the movement direction
        if (movementDirection.length() > 0) {
            movementDirection.normalize();
        }
        
        // Apply movement speed
        movementDirection.multiplyScalar(keyboardMovementSpeed);
        
        // Move the dog (only X and Z, preserve Y during jumps)
        const oldY = dog.position.y; // Store current Y position
        dog.position.x += movementDirection.x;
        dog.position.z += movementDirection.z;
        
        // Only apply wobble if not jumping
        if (!isJumping) {
            wobbleOffset += delta * wobbleFrequency;
            const wobbleValue = Math.sin(wobbleOffset) * wobbleAmplitude;
            dog.position.y = wobbleValue; // Apply the wobble to the Y position
        } else {
            // Preserve the Y position during jumps
            dog.position.y = oldY;
        }
        
        // Rotate the dog to face the direction of movement
        if (movementDirection.x !== 0 || movementDirection.z !== 0) {
            const targetRotation = Math.atan2(movementDirection.x, movementDirection.z);
            dog.rotation.y = targetRotation;
        }
        
        // Ensure the walk animation is playing
        if (walkAction && walkAction.paused) {
            walkAction.paused = false;
        }
        
        // Reset the target position to the current position
        // This prevents the click-to-move from taking over
        targetPosition.copy(dog.position);
        isAtTarget = true;
    } else if (dog) {
        // Handle click-to-move if no keyboard input
        if (!isAtTarget) {
            // Calculate direction to target
            const direction = new THREE.Vector3();
            direction.subVectors(targetPosition, dog.position);
            
            // Only move if we're not very close to the target
            if (direction.length() > 0.1) {
                // Normalize and scale by speed
                direction.normalize();
                direction.multiplyScalar(walkSpeed * delta * 60);
                
                // Move the dog (only X and Z, preserve Y during jumps)
                const oldY = dog.position.y; // Store current Y position
                dog.position.x += direction.x;
                dog.position.z += direction.z;
                
                // Only apply wobble if not jumping
                if (!isJumping) {
                    wobbleOffset += delta * wobbleFrequency;
                    const wobbleValue = Math.sin(wobbleOffset) * wobbleAmplitude;
                    dog.position.y = wobbleValue; // Apply the wobble to the Y position
                } else {
                    // Preserve the Y position during jumps
                    dog.position.y = oldY;
                }
                
                // Rotate the dog to face the direction of movement
                const targetRotation = Math.atan2(direction.x, direction.z);
                dog.rotation.y = targetRotation;
                
                // Make sure the dog is walking
                if (walkAction && walkAction.paused) {
                    walkAction.paused = false;
                }
            } else {
                // We've reached the target
                if (!isJumping) {
                    dog.position.y = 0; // Reset Y position only if not jumping
                }
                
                // Pause the walking animation
                if (walkAction) {
                    walkAction.paused = true;
                }
                
                // Make the dog look at the camera
                makeDogLookAtCamera();
                isAtTarget = true;
            }
        }
    }
    
    // Handle camera controls with arrow keys
    if (dog) {
        // Update camera relative position based on arrow keys
        if (cameraKeyStates.ArrowLeft) {
            // Orbit left around the dog
            cameraRelativePosition.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraOrbitSpeed);
        }
        if (cameraKeyStates.ArrowRight) {
            // Orbit right around the dog
            cameraRelativePosition.applyAxisAngle(new THREE.Vector3(0, 1, 0), -cameraOrbitSpeed);
        }
        if (cameraKeyStates.ArrowUp) {
            // Move camera DOWN and CLOSER to the dog with increased speed
            cameraRelativePosition.y -= cameraHeightSpeed * 1.5; // Apply the same multiplier as down arrow
            
            // Adjust distance to bring camera closer with more dramatic effect
            const horizontalDistance = Math.sqrt(
                cameraRelativePosition.x * cameraRelativePosition.x + 
                cameraRelativePosition.z * cameraRelativePosition.z
            );
            
            const factor = 1 - cameraDistanceFactor * cameraHeightSpeed / Math.max(0.1, horizontalDistance);
            cameraRelativePosition.x *= factor;
            cameraRelativePosition.z *= factor;
            
            // Clamp the height to prevent going too low
            cameraRelativePosition.y = Math.max(cameraMinHeight, cameraRelativePosition.y);
        }
        if (cameraKeyStates.ArrowDown) {
            // Move camera UP and FARTHER from the dog with increased height gain
            cameraRelativePosition.y += cameraHeightSpeed * 1.5; // Apply a multiplier for faster upward movement
            
            // Adjust distance to move camera farther
            const factor = 1 + cameraDistanceFactor * cameraHeightSpeed / 
                Math.sqrt(cameraRelativePosition.x * cameraRelativePosition.x + cameraRelativePosition.z * cameraRelativePosition.z);
            cameraRelativePosition.x *= factor;
            cameraRelativePosition.z *= factor;
            
            // Clamp the height and distance with increased maximum height
            cameraRelativePosition.y = Math.min(cameraMaxHeight, cameraRelativePosition.y);
            const distance = cameraRelativePosition.length();
            if (distance > cameraMaxDistance) {
                cameraRelativePosition.multiplyScalar(cameraMaxDistance / distance);
            }
        }
        
        // Set camera position relative to dog
        camera.position.copy(dog.position).add(cameraRelativePosition);
        
        // Make camera look at the dog (slightly above the dog's position)
        camera.lookAt(dog.position.x, dog.position.y + 0.5, dog.position.z);
        
        // Update orbit controls target
        controls.target.set(dog.position.x, dog.position.y + 0.5, dog.position.z);
    }
    
    controls.update();
    
    renderer.render(scene, camera);
}

// Add the missing animateHatMaker function
function animateHatMaker() {
    requestAnimationFrame(animateHatMaker);
    
    // Only update if the modal is visible
    if (document.getElementById('hat-maker-modal').style.display === 'block') {
        hatMakerControls.update();
        hatMakerRenderer.render(hatMakerScene, hatMakerCamera);
    }
}

// Test function to add a shape directly
function testAddShape() {
    console.log('Testing shape addition');
    const shapeType = 'sphere';
    const color = '#ff0000';
    
    // Create geometry and material
    const geometry = new THREE.SphereGeometry(0.5, 32, 32);
    const material = new THREE.MeshStandardMaterial({ color: color });
    const mesh = new THREE.Mesh(geometry, material);
    
    // Set position
    mesh.position.set(0, 1.5, 0);
    
    // Add to scene
    hatMakerScene.add(mesh);
    
    // Create shape info
    const shapeInfo = {
        id: Date.now(),
        type: shapeType,
        mesh: mesh,
        color: color,
        position: { x: 0, y: 1.5, z: 0 },
        rotation: { x: 0, y: 0, z: 0 }
    };
    
    // Add to shapes array
    hatShapes.push(shapeInfo);
    
    // Update UI
    updateShapeList();
    
    console.log('Test shape added');
}

// Function to save all custom hats to localStorage
function saveHatsToLocalStorage() {
    // We can't directly store Three.js objects in localStorage,
    // so we'll convert them to a serializable format
    const hatsToSave = {};
    
    for (const [hatId, hatInfo] of Object.entries(customHats)) {
        // Create a serializable version of each hat
        const serializedHat = {
            name: hatInfo.name,
            shapes: []
        };
        
        // Convert each shape in the hat to a serializable format
        hatInfo.group.children.forEach(shape => {
            serializedHat.shapes.push({
                type: getShapeType(shape.geometry),
                position: {
                    x: shape.position.x,
                    y: shape.position.y,
                    z: shape.position.z
                },
                rotation: {
                    x: shape.rotation.x,
                    y: shape.rotation.y,
                    z: shape.rotation.z
                },
                color: '#' + shape.material.color.getHexString()
            });
        });
        
        hatsToSave[hatId] = serializedHat;
    }
    
    // Save to localStorage
    localStorage.setItem('customHats', JSON.stringify(hatsToSave));
    localStorage.setItem('currentHatId', currentHatId.toString());
    console.log('Hats saved to localStorage');
}

// Function to load custom hats from localStorage
function loadHatsFromLocalStorage() {
    const savedHats = localStorage.getItem('customHats');
    const savedHatId = localStorage.getItem('currentHatId');
    
    if (savedHats) {
        try {
            const parsedHats = JSON.parse(savedHats);
            
            // Restore the current hat ID counter
            if (savedHatId) {
                currentHatId = parseInt(savedHatId);
            }
            
            // Recreate each hat
            for (const [hatId, hatInfo] of Object.entries(parsedHats)) {
                // Create a group for the hat
                const hatGroup = new THREE.Group();
                
                // Recreate each shape in the hat
                hatInfo.shapes.forEach(shapeInfo => {
                    // Create geometry based on shape type
                    let geometry;
                    let shapeType = shapeInfo.type;
                    
                    // Ensure we have a valid shape type
                    if (!shapeType || shapeType === 'unknown') {
                        // Try to infer from other properties
                        if (shapeInfo.scale && shapeInfo.scale.x === shapeInfo.scale.y && 
                            shapeInfo.scale.y === shapeInfo.scale.z) {
                            shapeType = 'sphere'; // Guess sphere for uniform scaling
                        } else {
                            shapeType = 'box'; // Default to box
                        }
                    }
                    
                    switch(shapeType) {
                        case 'cone':
                            geometry = new THREE.ConeGeometry(0.5, 1, 32);
                            break;
                        case 'cylinder':
                            geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
                            break;
                        case 'sphere':
                            geometry = new THREE.SphereGeometry(0.5, 32, 32);
                            break;
                        case 'box':
                            geometry = new THREE.BoxGeometry(1, 1, 1);
                            break;
                        case 'torus':
                            geometry = new THREE.TorusGeometry(0.5, 0.2, 16, 32);
                            break;
                        default:
                            console.warn('Unknown shape type, using box as fallback');
                            geometry = new THREE.BoxGeometry(1, 1, 1);
                            shapeType = 'box';
                            break;
                    }
                    
                    // Create material
                    const material = new THREE.MeshStandardMaterial({ 
                        color: shapeInfo.color || '#ff0000',
                        metalness: 0.3,
                        roughness: 0.7
                    });
                    
                    // Create mesh
                    const mesh = new THREE.Mesh(geometry, material);
                    
                    // Set position, rotation, and scale
                    mesh.position.set(
                        shapeInfo.position.x || 0,
                        shapeInfo.position.y || 0,
                        shapeInfo.position.z || 0
                    );
                    
                    mesh.rotation.set(
                        shapeInfo.rotation.x || 0,
                        shapeInfo.rotation.y || 0,
                        shapeInfo.rotation.z || 0
                    );
                    
                    mesh.scale.set(
                        shapeInfo.scale.x || 1,
                        shapeInfo.scale.y || 1,
                        shapeInfo.scale.z || 1
                    );
                    
                    // Store the shape type on the mesh for later reference
                    mesh.userData.shapeType = shapeType;
                    
                    // Add to hat group
                    hatGroup.add(mesh);
                });
                
                // Store the hat
                customHats[hatId] = {
                    name: hatInfo.name || `Hat ${hatId}`,
                    group: hatGroup
                };
                
                // Add to the selector
                addHatToSelector(hatId, hatInfo.name || `Hat ${hatId}`);
            }
            
            console.log('Hats loaded from localStorage');
        } catch (error) {
            console.error('Error loading hats from localStorage:', error);
            // Clear corrupted data
            localStorage.removeItem('customHats');
            localStorage.removeItem('currentHatId');
        }
    }
}

// Function to clear all saved hats
function clearSavedHats() {
    // Clear from localStorage
    localStorage.removeItem('customHats');
    localStorage.removeItem('currentHatId');
    
    // Clear from memory
    customHats = {};
    currentHatId = 0;
    
    // Clear from UI
    document.getElementById('saved-hats-container').innerHTML = '';
    
    // Remove current hat if there is one
    removeHat();
    
    console.log('All saved hats cleared');
}

// Add a button to clear saved hats (optional)
// You can add this to your HTML:
// <button id="clear-saved-hats">Clear All Saved Hats</button>

// And add this to your event listeners:
document.getElementById('clear-saved-hats').addEventListener('click', function() {
    if (confirm('Are you sure you want to delete all saved hats? This cannot be undone.')) {
        clearSavedHats();
    }
});

// Add a new function to handle resizing the hat maker preview
function resizeHatMakerPreview() {
    const container = document.getElementById('hat-preview-container');
    if (!container || !hatMakerRenderer || !hatMakerCamera) return;
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    hatMakerCamera.aspect = width / height;
    hatMakerCamera.updateProjectionMatrix();
    hatMakerRenderer.setSize(width, height);
    
    console.log('Hat maker preview resized:', width, 'x', height);
}

// Update the function to create a solid grey dog model
function addTransparentDogToHatMaker() {
    const dogModelUrl = 'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/dog/model.gltf';
    
    // Load the dog model
    const loader = new THREE.GLTFLoader();
    loader.load(
        dogModelUrl,
        function (gltf) {
            const model = gltf.scene;
            
            // Use the exact same scale as the main dog
            model.scale.set(1.5, 1.5, 1.5);
            
            // Make all materials solid grey
            model.traverse(function (object) {
                if (object.isMesh) {
                    // Clone the material to avoid affecting the main dog
                    object.material = object.material.clone();
                    object.material.transparent = false; // Make it solid
                    object.material.color.set(0xAAAAAA); // Medium grey color
                    
                    // Enable shadows for better visibility
                    object.castShadow = true;
                    object.receiveShadow = true;
                }
            });
            
            // Position the dog at the center of the scene
            model.position.set(0, 0, 0); // Set Y to 0 to place on ground
            
            // Add to the hat maker scene
            hatMakerScene.add(model);
            
            // Store a reference to the dog model
            hatMakerDog = model;
            
            console.log('Grey dog model added to hat maker');
            
            // Adjust camera to focus on the top of the dog's head
            hatMakerCamera.position.set(0, 2.5, 3);
            hatMakerControls.target.set(0, 1.2, 0); // Target the top of the dog's head
            hatMakerControls.update();
        },
        function (xhr) {
            console.log('Loading dog model: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
        },
        function (error) {
            console.error('Error loading dog model', error);
        }
    );
}

// Update the debug function to match the new position
function debugHatPosition() {
    // Create a visible marker at the hat attachment point
    const markerGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    
    // Position it at the same point where hats are attached
    marker.position.set(0, 0.15, 0); // Updated to match the new hat position
    
    // Add it to the dog
    if (dog) {
        dog.add(marker);
        console.log("Added position debug marker to dog");
    }
}

// Consolidate keyboard event handling
function setupKeyboardControls() {
    const keyHandlers = {
        'keydown': {
            'w': () => keyStates.w = true,
            'a': () => keyStates.a = true,
            's': () => keyStates.s = true,
            'd': () => keyStates.d = true,
            'ArrowUp': (e) => { cameraKeyStates.ArrowUp = true; e.preventDefault(); },
            'ArrowDown': (e) => { cameraKeyStates.ArrowDown = true; e.preventDefault(); },
            'ArrowLeft': (e) => { cameraKeyStates.ArrowLeft = true; e.preventDefault(); },
            'ArrowRight': (e) => { cameraKeyStates.ArrowRight = true; e.preventDefault(); },
            'Space': () => makeModelJump()
        },
        'keyup': {
            'w': () => keyStates.w = false,
            'a': () => keyStates.a = false,
            's': () => keyStates.s = false,
            'd': () => keyStates.d = false,
            'ArrowUp': () => cameraKeyStates.ArrowUp = false,
            'ArrowDown': () => cameraKeyStates.ArrowDown = false,
            'ArrowLeft': () => cameraKeyStates.ArrowLeft = false,
            'ArrowRight': () => cameraKeyStates.ArrowRight = false
        }
    };
    
    ['keydown', 'keyup'].forEach(eventType => {
        document.addEventListener(eventType, function(event) {
            // Skip if hat maker is open
            if (document.getElementById('hat-maker-modal').style.display === 'block') return;
            
            const key = event.key.toLowerCase();
            const handler = keyHandlers[eventType][key] || keyHandlers[eventType][event.key];
            
            if (handler) handler(event);
        });
    });
}

// Add these variables near the top of your script with the other variables
let dogCustomized = false;
let dogName = "Buddy"; // Default name
let dogColors = {
    body: "#8B4513", // Default brown
    ears: "#6B2E0E",
    tail: "#8B4513",
    paws: "#5C3317"
};

// Check if the dog has been customized before
function checkDogCustomization() {
    // Check localStorage for saved customization
    const savedCustomization = localStorage.getItem('dogCustomization');
    if (savedCustomization) {
        const customization = JSON.parse(savedCustomization);
        dogName = customization.name;
        dogColors = customization.colors;
        dogCustomized = true;
        return true;
    }
    return false;
}

// Show the pet customization screen
function showPetCustomizationScreen() {
    // Create the modal if it doesn't exist
    if (!document.getElementById('pet-customization-modal')) {
        createPetCustomizationModal();
    }
    
    // Show the modal
    document.getElementById('pet-customization-modal').style.display = 'block';
    
    // Initialize the preview
    initPetCustomizationPreview();
}

// Create the pet customization modal
function createPetCustomizationModal() {
    const modal = document.createElement('div');
    modal.id = 'pet-customization-modal';
    modal.className = 'modal';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content pet-customization-content';
    
    modalContent.innerHTML = `
        <h2>Customize Your Pet</h2>
        <p>Welcome! Let's customize your new pet dog.</p>
        
        <div class="pet-customization-layout">
            <div id="pet-preview-container"></div>
            
            <div class="pet-customization-controls">
                <div class="name-section">
                    <label for="pet-name">Name your pet:</label>
                    <input type="text" id="pet-name" value="${dogName}" placeholder="Enter a name">
                </div>
                
                <div class="color-section">
                    <h3>Colors</h3>
                    
                    <div class="color-control">
                        <label for="body-color">Body:</label>
                        <input type="color" id="body-color" value="${dogColors.body}">
                    </div>
                    
                    <div class="color-control">
                        <label for="ears-color">Ears:</label>
                        <input type="color" id="ears-color" value="${dogColors.ears}">
                    </div>
                    
                    <div class="color-control">
                        <label for="tail-color">Tail:</label>
                        <input type="color" id="tail-color" value="${dogColors.tail}">
                    </div>
                    
                    <div class="color-control">
                        <label for="paws-color">Paws:</label>
                        <input type="color" id="paws-color" value="${dogColors.paws}">
                    </div>
                </div>
                
                <button id="save-pet-customization" class="primary-button">Start Playing</button>
            </div>
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Add event listeners
    document.getElementById('save-pet-customization').addEventListener('click', savePetCustomization);
    
    // Add color change listeners
    document.getElementById('body-color').addEventListener('input', updatePetPreview);
    document.getElementById('ears-color').addEventListener('input', updatePetPreview);
    document.getElementById('tail-color').addEventListener('input', updatePetPreview);
    document.getElementById('paws-color').addEventListener('input', updatePetPreview);
}

// Initialize the pet customization preview
let petPreviewScene, petPreviewCamera, petPreviewRenderer, petPreviewDog;

function initPetCustomizationPreview() {
    const container = document.getElementById('pet-preview-container');
    
    // Clear any existing content
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    
    // Set up scene
    petPreviewScene = new THREE.Scene();
    petPreviewScene.background = new THREE.Color(0xf0f0f0);
    
    // Set up camera
    petPreviewCamera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    petPreviewCamera.position.set(0, 1.5, 3);
    
    // Set up renderer
    petPreviewRenderer = new THREE.WebGLRenderer({ antialias: true });
    petPreviewRenderer.setSize(container.clientWidth, container.clientHeight);
    petPreviewRenderer.shadowMap.enabled = true;
    container.appendChild(petPreviewRenderer.domElement);
    
    // Add orbit controls
    const controls = new THREE.OrbitControls(petPreviewCamera, petPreviewRenderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0.7, 0);
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    petPreviewScene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    petPreviewScene.add(directionalLight);
    
    // Add ground
    const groundGeometry = new THREE.PlaneGeometry(10, 10);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xcccccc,
        roughness: 0.8,
        metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    petPreviewScene.add(ground);
    
    // Load the dog model
    loadPetPreviewDog();
    
    // Start animation
    animatePetPreview();
}

// Load the dog model for the preview
function loadPetPreviewDog() {
    const loader = new THREE.GLTFLoader();
    loader.load(
        'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/dog/model.gltf',
        function (gltf) {
            const model = gltf.scene;
            model.scale.set(1.5, 1.5, 1.5);
            
            // Apply colors to the model
            model.traverse(function (object) {
                if (object.isMesh) {
                    // Clone the material to avoid affecting other instances
                    object.material = object.material.clone();
                    
                    // Apply different colors based on the mesh name or position
                    if (object.name.includes('body') || object.position.y > 0.5) {
                        object.material.color.set(dogColors.body);
                    } else if (object.name.includes('ear') || (object.position.y > 1 && object.position.x !== 0)) {
                        object.material.color.set(dogColors.ears);
                    } else if (object.name.includes('tail') || object.position.z < -0.5) {
                        object.material.color.set(dogColors.tail);
                    } else if (object.name.includes('paw') || object.position.y < 0.2) {
                        object.material.color.set(dogColors.paws);
                    }
                    
                    object.castShadow = true;
                    object.receiveShadow = true;
                }
            });
            
            petPreviewDog = model;
            petPreviewScene.add(petPreviewDog);
            
            // Rotate the dog to face the camera
            petPreviewDog.rotation.y = Math.PI / 4;
            
            // Add animation
            const mixer = new THREE.AnimationMixer(model);
            if (gltf.animations.length > 0) {
                const idleAction = mixer.clipAction(gltf.animations[0]);
                idleAction.play();
            }
        },
        function (xhr) {
            console.log('Loading dog model: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
        },
        function (error) {
            console.error('Error loading dog model', error);
        }
    );
}

// Update the pet preview when colors change
function updatePetPreview() {
    // Get current color values
    dogColors.body = document.getElementById('body-color').value;
    dogColors.ears = document.getElementById('ears-color').value;
    dogColors.tail = document.getElementById('tail-color').value;
    dogColors.paws = document.getElementById('paws-color').value;
    
    // Update the model if it exists
    if (petPreviewDog) {
        petPreviewDog.traverse(function (object) {
            if (object.isMesh) {
                // Apply different colors based on the mesh name or position
                if (object.name.includes('body') || object.position.y > 0.5) {
                    object.material.color.set(dogColors.body);
                } else if (object.name.includes('ear') || (object.position.y > 1 && object.position.x !== 0)) {
                    object.material.color.set(dogColors.ears);
                } else if (object.name.includes('tail') || object.position.z < -0.5) {
                    object.material.color.set(dogColors.tail);
                } else if (object.name.includes('paw') || object.position.y < 0.2) {
                    object.material.color.set(dogColors.paws);
                }
            }
        });
    }
}

// Animate the pet preview
function animatePetPreview() {
    if (document.getElementById('pet-customization-modal').style.display !== 'none') {
        requestAnimationFrame(animatePetPreview);
        
        // Rotate the dog slowly
        if (petPreviewDog) {
            petPreviewDog.rotation.y += 0.005;
        }
        
        petPreviewRenderer.render(petPreviewScene, petPreviewCamera);
    }
}

// Save the pet customization
function savePetCustomization() {
    // Get the name
    dogName = document.getElementById('pet-name').value || "Buddy";
    
    // Get the colors
    dogColors.body = document.getElementById('body-color').value;
    dogColors.ears = document.getElementById('ears-color').value;
    dogColors.tail = document.getElementById('tail-color').value;
    dogColors.paws = document.getElementById('paws-color').value;
    
    // Save to localStorage
    localStorage.setItem('dogCustomization', JSON.stringify({
        name: dogName,
        colors: dogColors
    }));
    
    // Mark as customized
    dogCustomized = true;
    
    // Close the modal
    document.getElementById('pet-customization-modal').style.display = 'none';
    
    // Update the main dog model with the new colors
    updateMainDogColors();
    
    // Update the UI with the dog's name
    updateDogNameInUI();
}

// Update the main dog model with the custom colors
function updateMainDogColors() {
    if (dog) {
        dog.traverse(function (object) {
            if (object.isMesh) {
                // Clone the material to avoid affecting other instances
                object.material = object.material.clone();
                
                // Apply different colors based on the mesh name or position
                if (object.name.includes('body') || object.position.y > 0.5) {
                    object.material.color.set(dogColors.body);
                } else if (object.name.includes('ear') || (object.position.y > 1 && object.position.x !== 0)) {
                    object.material.color.set(dogColors.ears);
                } else if (object.name.includes('tail') || object.position.z < -0.5) {
                    object.material.color.set(dogColors.tail);
                } else if (object.name.includes('paw') || object.position.y < 0.2) {
                    object.material.color.set(dogColors.paws);
                }
            }
        });
    }
}

// Update the UI with the dog's name
function updateDogNameInUI() {
    // Create or update the dog name display
    let nameDisplay = document.getElementById('dog-name-display');
    
    if (!nameDisplay) {
        nameDisplay = document.createElement('div');
        nameDisplay.id = 'dog-name-display';
        document.getElementById('info').appendChild(nameDisplay);
    }
    
    nameDisplay.textContent = dogName;
}

// Add this after the model loading and animation setup section
let isJumping = false;
let jumpHeight = 1.5; // Maximum height of the jump
let jumpSpeed = 0.05; // Speed of the jump animation

function makeModelJump() {
    if (isJumping || !dog) return; // Don't allow jumping while already in the air, and check if dog exists
    
    isJumping = true;
    
    // Initial position
    const initialY = dog.position.y;
    
    // Jump up animation
    const jumpUp = gsap.to(dog.position, {
        y: initialY + jumpHeight,
        duration: 0.4,
        ease: "power1.out",
        onComplete: () => {
            // Fall down animation
            gsap.to(dog.position, {
                y: initialY,
                duration: 0.4,
                ease: "power1.in",
                onComplete: () => {
                    isJumping = false;
                }
            });
        }
    });
}

// Add keyboard event listener for jumping
document.addEventListener('keydown', (event) => {
    // Jump when spacebar is pressed
    if (event.code === 'Space') {
        makeModelJump();
    }
});

// Add this after your existing code

// Make the dog name clickable to open customization
document.addEventListener('DOMContentLoaded', function() {
    // Create the dog name display if it doesn't exist
    let nameDisplay = document.getElementById('dog-name-display');
    if (!nameDisplay) {
        nameDisplay = document.createElement('div');
        nameDisplay.id = 'dog-name-display';
        nameDisplay.className = 'clickable-name';
        document.getElementById('info').appendChild(nameDisplay);
    }
    
    // Set the initial name
    nameDisplay.textContent = dogName;
    
    // Add click event to open customization
    nameDisplay.addEventListener('click', openDogCustomization);
    
    // Close dog customization modal
    document.getElementById('close-dog-modal').addEventListener('click', function() {
        document.getElementById('dog-customization-modal').style.display = 'none';
    });
    
    // Save dog customization
    document.getElementById('save-dog-customization').addEventListener('click', saveDogCustomization);
});

// Variables for dog customization preview
let dogPreviewScene, dogPreviewCamera, dogPreviewRenderer, dogPreviewModel;

// Function to open dog customization with improved mesh-based color mapping
function openDogCustomization() {
    // Show the modal
    document.getElementById('dog-customization-modal').style.display = 'block';
    
    // Set current values
    document.getElementById('dog-name-input').value = dogName;
    
    // Update color inputs based on the model's actual parts
    document.getElementById('body-color').value = dogColors.body;
    document.getElementById('head-color').value = dogColors.head || dogColors.body; // Default to body color if not set
    document.getElementById('left-leg-color').value = dogColors.leftLeg || dogColors.paws; // Default to paws color if not set
    document.getElementById('right-leg-color').value = dogColors.rightLeg || dogColors.paws; // Default to paws color if not set
    document.getElementById('tongue-color').value = dogColors.tongue || "#FF0303"; // Default red
    document.getElementById('eyes-color').value = dogColors.eyes || "#000000"; // Default black
    
    // Initialize the preview
    initDogPreview();
    
    // Add event listeners for color changes
    document.querySelectorAll('.color-control input[type="color"]').forEach(input => {
        input.addEventListener('input', updateDogPreview);
    });
    
    // Add event listeners for color schemes
    document.querySelectorAll('.scheme-btn').forEach(button => {
        button.addEventListener('click', function() {
            const scheme = this.getAttribute('data-scheme');
            applyColorScheme(scheme);
        });
    });
}

// Function to initialize the dog preview
function initDogPreview() {
    const container = document.getElementById('dog-preview-container');
    
    // Clear any existing content
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    
    // Set up scene
    dogPreviewScene = new THREE.Scene();
    dogPreviewScene.background = new THREE.Color(0xf0f0f0);
    
    // Set up camera
    dogPreviewCamera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    dogPreviewCamera.position.set(0, 1.5, 3);
    
    // Set up renderer
    dogPreviewRenderer = new THREE.WebGLRenderer({ antialias: true });
    dogPreviewRenderer.setSize(container.clientWidth, container.clientHeight);
    dogPreviewRenderer.shadowMap.enabled = true;
    container.appendChild(dogPreviewRenderer.domElement);
    
    // Add orbit controls
    const controls = new THREE.OrbitControls(dogPreviewCamera, dogPreviewRenderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0.7, 0);
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    dogPreviewScene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    dogPreviewScene.add(directionalLight);
    
    // Add ground
    const groundGeometry = new THREE.PlaneGeometry(10, 10);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xcccccc,
        roughness: 0.8,
        metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    dogPreviewScene.add(ground);
    
    // Load the dog model
    loadDogPreviewModel();
    
    // Start animation
    animateDogPreview();
}

// Function to load the dog model for preview
function loadDogPreviewModel() {
    const loader = new THREE.GLTFLoader();
    loader.load(
        'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/dog/model.gltf',
        function (gltf) {
            const model = gltf.scene;
            model.scale.set(1.5, 1.5, 1.5);
            
            // Apply colors to the model
            model.traverse(function (object) {
                if (object.isMesh) {
                    // Clone the material to avoid affecting other instances
                    object.material = object.material.clone();
                    
                    // Apply different colors based on the mesh name or position
                    if (object.name.includes('body') || object.position.y > 0.5) {
                        object.material.color.set(dogColors.body);
                    } else if (object.name.includes('ear') || (object.position.y > 1 && object.position.x !== 0)) {
                        object.material.color.set(dogColors.ears);
                    } else if (object.name.includes('tail') || object.position.z < -0.5) {
                        object.material.color.set(dogColors.tail);
                    } else if (object.name.includes('paw') || object.position.y < 0.2) {
                        object.material.color.set(dogColors.paws);
                    }
                    
                    object.castShadow = true;
                    object.receiveShadow = true;
                }
            });
            
            dogPreviewModel = model;
            dogPreviewScene.add(dogPreviewModel);
            
            // Rotate the dog to face the camera
            dogPreviewModel.rotation.y = Math.PI / 4;
            
            // Add animation
            const mixer = new THREE.AnimationMixer(model);
            if (gltf.animations.length > 0) {
                const idleAction = mixer.clipAction(gltf.animations[0]);
                idleAction.play();
            }
        },
        function (xhr) {
            console.log('Loading dog model: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
        },
        function (error) {
            console.error('Error loading dog model', error);
        }
    );
}

// Function to update the dog preview
function updateDogPreview() {
    // Get current color values
    const bodyColor = document.getElementById('body-color').value;
    const headColor = document.getElementById('head-color').value;
    const leftLegColor = document.getElementById('left-leg-color').value;
    const rightLegColor = document.getElementById('right-leg-color').value;
    const tongueColor = document.getElementById('tongue-color').value;
    const eyesColor = document.getElementById('eyes-color').value;
    
    // Update the preview model
    if (dogPreviewModel) {
        dogPreviewModel.traverse(function(object) {
            if (object.isMesh) {
                // Apply colors based on the mesh name from the GLTF file
                if (object.name === 'character_dog' || object.parent.name === 'character_dog') {
                    object.material.color.set(bodyColor);
                } 
                else if (object.name === 'character_dogHead' || object.parent.name === 'character_dogHead') {
                    // For the head, we need to check if it's the main part or the tongue/eyes
                    if (object.material.name === 'Red.034' || object.material.name.includes('Red')) {
                        object.material.color.set(tongueColor);
                    } 
                    else if (object.material.name === 'Black.026' || object.material.name.includes('Black')) {
                        object.material.color.set(eyesColor);
                    } 
                    else {
                        object.material.color.set(headColor);
                    }
                } 
                else if (object.name === 'character_dogArmLeft' || object.parent.name === 'character_dogArmLeft') {
                    object.material.color.set(leftLegColor);
                } 
                else if (object.name === 'character_dogArmRight' || object.parent.name === 'character_dogArmRight') {
                    object.material.color.set(rightLegColor);
                }
            }
        });
    }
}

// Function to apply a color scheme
function applyColorScheme(scheme) {
    switch(scheme) {
        case 'classic':
            document.getElementById('body-color').value = '#B36B35'; // Match the original beige color
            document.getElementById('head-color').value = '#B36B35';
            document.getElementById('left-leg-color').value = '#B36B35';
            document.getElementById('right-leg-color').value = '#B36B35';
            document.getElementById('tongue-color').value = '#FF0303'; // Bright red
            document.getElementById('eyes-color').value = '#050808'; // Match the original black
            break;
        case 'golden':
            document.getElementById('body-color').value = '#D2B48C'; // Tan
            document.getElementById('head-color').value = '#D2B48C';
            document.getElementById('left-leg-color').value = '#A0522D'; // Sienna
            document.getElementById('right-leg-color').value = '#A0522D';
            document.getElementById('tongue-color').value = '#FF6B6B'; // Lighter red
            document.getElementById('eyes-color').value = '#000000';
            break;
        case 'dalmatian':
            document.getElementById('body-color').value = '#FFFFFF'; // White
            document.getElementById('head-color').value = '#FFFFFF';
            document.getElementById('left-leg-color').value = '#FFFFFF';
            document.getElementById('right-leg-color').value = '#FFFFFF';
            document.getElementById('tongue-color').value = '#FF6B6B';
            document.getElementById('eyes-color').value = '#000000';
            break;
        case 'husky':
            document.getElementById('body-color').value = '#D3D3D3'; // Light gray
            document.getElementById('head-color').value = '#696969'; // Dark gray
            document.getElementById('left-leg-color').value = '#D3D3D3';
            document.getElementById('right-leg-color').value = '#D3D3D3';
            document.getElementById('tongue-color').value = '#FF6B6B';
            document.getElementById('eyes-color').value = '#0066FF'; // Blue eyes
            break;
    }
    
    // Update the preview
    updateDogPreview();
}

// Function to save dog customization
function saveDogCustomization() {
    // Get the new name
    dogName = document.getElementById('dog-name-input').value || "Buddy";
    
    // Get the new colors
    dogColors = {
        body: document.getElementById('body-color').value,
        head: document.getElementById('head-color').value,
        leftLeg: document.getElementById('left-leg-color').value,
        rightLeg: document.getElementById('right-leg-color').value,
        tongue: document.getElementById('tongue-color').value,
        eyes: document.getElementById('eyes-color').value,
        
        // Keep these for backward compatibility
        ears: document.getElementById('head-color').value,
        tail: document.getElementById('body-color').value,
        paws: document.getElementById('left-leg-color').value
    };
    
    // Save to localStorage
    localStorage.setItem('dogCustomization', JSON.stringify({
        name: dogName,
        colors: dogColors
    }));
    
    // Update the main dog model
    updateMainDogColors();
    
    // Update the name display
    updateDogNameInUI();
    
    // Close the modal
    document.getElementById('dog-customization-modal').style.display = 'none';
}

// Update the main dog model with the custom colors
function updateMainDogColors() {
    if (dog) {
        dog.traverse(function(object) {
            if (object.isMesh) {
                // Clone the material to avoid affecting other instances
                object.material = object.material.clone();
                
                // Apply colors based on the mesh name from the GLTF file
                if (object.name === 'character_dog' || object.parent.name === 'character_dog') {
                    object.material.color.set(dogColors.body);
                } 
                else if (object.name === 'character_dogHead' || object.parent.name === 'character_dogHead') {
                    // For the head, we need to check if it's the main part or the tongue/eyes
                    if (object.material.name === 'Red.034' || object.material.name.includes('Red')) {
                        object.material.color.set(dogColors.tongue);
                    } 
                    else if (object.material.name === 'Black.026' || object.material.name.includes('Black')) {
                        object.material.color.set(dogColors.eyes);
                    } 
                    else {
                        object.material.color.set(dogColors.head);
                    }
                } 
                else if (object.name === 'character_dogArmLeft' || object.parent.name === 'character_dogArmLeft') {
                    object.material.color.set(dogColors.leftLeg);
                } 
                else if (object.name === 'character_dogArmRight' || object.parent.name === 'character_dogArmRight') {
                    object.material.color.set(dogColors.rightLeg);
                }
            }
        });
    }
}

// Function to animate the dog preview - remove the auto-rotation
function animateDogPreview() {
    if (document.getElementById('dog-customization-modal').style.display === 'block') {
        requestAnimationFrame(animateDogPreview);
        
        // Remove the auto-rotation
        // if (dogPreviewModel) {
        //     dogPreviewModel.rotation.y += 0.005;
        // }
        
        dogPreviewRenderer.render(dogPreviewScene, dogPreviewCamera);
    }
}

// Add this after the other variable declarations
let hatMakerPasswordChecked = true; // Changed from false to true to bypass password check

// Modify the event listener for opening the hat maker
document.addEventListener('DOMContentLoaded', function() {
    // ... existing code ...
    
    // Open hat maker modal without password check
    document.getElementById('open-hat-maker').addEventListener('click', function() {
        openHatMaker(); // Directly open the hat maker without password check
    });
    
    // ... rest of the existing event listeners ...
});

// Replace the checkHatMakerPassword function with this simplified version
function checkHatMakerPassword() {
    // No password check, just open the hat maker
    hatMakerPasswordChecked = true;
    openHatMaker();
}

// ... rest of your existing code ...

// Organize code into logical modules using IIFE pattern
const DogApp = (function() {
    // Private variables
    let dog, mixer, walkAction, clock;
    let currentHat = null;
    let customHats = {};
    
    // Public methods
    return {
        init: function() {
            // Initialize the scene, camera, renderer
            this.setupScene();
            this.loadDogModel();
            this.setupEventListeners();
        },
        
        setupScene: function() {
            // Scene setup code here
        },
        
        loadDogModel: function() {
            // Dog model loading code here
        },
        
        // Other methods...
    };
})();

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    DogApp.init();
});

// ... existing code ... 

// Create a separate module for hat maker functionality
const HatMaker = (function() {
    // Private variables
    let hatMakerScene, hatMakerCamera, hatMakerRenderer, hatMakerControls;
    let hatShapes = [];
    let selectedShape = null;
    
    // Public methods
    return {
        init: function() {
            this.initHatMaker();
            this.setupHatMakerEvents();
        },
        
        initHatMaker: function() {
            // Hat maker initialization code
        },
        
        // Other hat maker methods...
    };
})();

// ... existing code ... 

// Simplify the dog color application logic
function updateDogColors(dogModel, colors) {
    if (!dogModel) return;
    
    dogModel.traverse(function(object) {
        if (!object.isMesh) return;
        
        // Clone the material to avoid affecting other instances
        object.material = object.material.clone();
        
        // Map of part identifiers to color properties
        const colorMap = {
            'character_dog': 'body',
            'character_dogHead': 'head',
            'character_dogArmLeft': 'leftLeg',
            'character_dogArmRight': 'rightLeg'
        };
        
        // Special cases for materials
        if (object.material.name.includes('Red')) {
            object.material.color.set(colors.tongue);
        } else if (object.material.name.includes('Black')) {
            object.material.color.set(colors.eyes);
        } else {
            // Check for part matches
            for (const [part, colorProp] of Object.entries(colorMap)) {
                if (object.name === part || object.parent.name === part) {
                    object.material.color.set(colors[colorProp]);
                    break;
                }
            }
        }
    });
}

// Create a reusable function for setting up a 3D scene
function setupScene(container, cameraPosition, controlsTarget) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    
    // Set up camera
    const camera = new THREE.PerspectiveCamera(
        75, 
        container.clientWidth / container.clientHeight, 
        0.1, 
        1000
    );
    camera.position.copy(cameraPosition);
    
    // Set up renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    
    // Add orbit controls
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.copy(controlsTarget);
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    return { scene, camera, renderer, controls };
}

// Create a storage utility
const Storage = {
    save: function(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    },
    
    load: function(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return defaultValue;
        }
    },
    
    remove: function(key) {
        localStorage.removeItem(key);
    }
};

// Example usage:
function saveHatsToLocalStorage() {
    const hatsToSave = {}; 
    // Convert hats to serializable format...
    
    Storage.save('customHats', hatsToSave);
    Storage.save('currentHatId', currentHatId.toString());
}

function loadHatsFromLocalStorage() {
    const savedHats = Storage.load('customHats', {});
    currentHatId = parseInt(Storage.load('currentHatId', '0'));
    
    // Process saved hats...
}

// Simplify authentication
const Auth = {
    password: 'nicehat',
    
    isAuthenticated: function() {
        return Storage.load('userAuthenticated') === 'true';
    },
    
    authenticate: function(password) {
        if (password === this.password) {
            Storage.save('userAuthenticated', 'true');
            return true;
        }
        return false;
    },
    
    showLoginPrompt: function(callback) {
        // Create and show login modal
        // On successful login, call callback
    }
};

// Usage
document.addEventListener('DOMContentLoaded', function() {
    if (Auth.isAuthenticated()) {
        initializeSite();
    } else {
        Auth.showLoginPrompt(initializeSite);
    }
});

// Modal management utility
const ModalManager = {
    modals: {},
    
    register: function(id, options = {}) {
        this.modals[id] = {
            element: document.getElementById(id),
            onOpen: options.onOpen || function() {},
            onClose: options.onClose || function() {}
        };
        
        // Add close button handler if present
        const closeBtn = this.modals[id].element.querySelector('.close-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close(id));
        }
        
        // Add click outside to close if enabled
        if (options.closeOnOutsideClick) {
            this.modals[id].element.addEventListener('click', (e) => {
                if (e.target === this.modals[id].element) this.close(id);
            });
        }
    },
    
    open: function(id) {
        if (!this.modals[id]) return;
        
        this.modals[id].element.style.display = 'block';
        this.modals[id].onOpen();
    },
    
    close: function(id) {
        if (!this.modals[id]) return;
        
        this.modals[id].element.style.display = 'none';
        this.modals[id].onClose();
    }
};

// Usage
document.addEventListener('DOMContentLoaded', function() {
    // Register modals
    ModalManager.register('hat-maker-modal', {
        closeOnOutsideClick: true,
        onOpen: function() {
            resizeHatMakerPreview();
            hatMakerRenderer.render(hatMakerScene, hatMakerCamera);
        }
    });
    
    ModalManager.register('save-hat-modal');
    ModalManager.register('dog-customization-modal');
    
    // Open a modal
    document.getElementById('open-hat-maker').addEventListener('click', function() {
        if (hatMakerPasswordChecked) {
            ModalManager.open('hat-maker-modal');
        } else {
            checkHatMakerPassword();
        }
    });
});

// Start the animation loop
animate();

// Add this call to initialize keyboard controls
document.addEventListener('DOMContentLoaded', function() {
    // ... existing code ...
    
    // Set up keyboard controls
    setupKeyboardControls();
    
    // ... existing code ...
});

// Function to open the hat maker
function openHatMaker() {
    console.log('Opening hat maker');
    
    // Show the modal directly
    document.getElementById('hat-maker-modal').style.display = 'block';
    
    // Initialize the hat maker if not already done
    if (!hatMakerScene) {
        initHatMaker();
    } else {
        // Force resize and render of the hat maker preview
        setTimeout(function() {
            resizeHatMakerPreview();
            hatMakerRenderer.render(hatMakerScene, hatMakerCamera);
        }, 100);
    }
    
    console.log('Hat maker opened');
}

// Let's add a test function to directly add a shape
function testAddShape() {
    console.log('Testing shape addition');
    
    // Create a sphere
    const geometry = new THREE.SphereGeometry(0.5, 32, 32);
    const material = new THREE.MeshStandardMaterial({ color: '#ff0000' });
    const mesh = new THREE.Mesh(geometry, material);
    
    // Position it on the dog's head
    mesh.position.set(0, 1.2, 0);
    
    // Add to scene
    hatMakerScene.add(mesh);
    
    // Create shape info
    const shapeInfo = {
        id: Date.now(),
        type: 'sphere',
        mesh: mesh,
        color: '#ff0000',
        position: { x: 0, y: 1.2, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        dimensions: { radius: 0.5 }
    };
    
    // Add to shapes array
    hatShapes.push(shapeInfo);
    
    // Update UI
    updateShapeList();
    
    console.log('Test shape added');
}

// Remove all event listeners from shape buttons and reattach them
function resetShapeButtonListeners() {
    console.log('Resetting shape button listeners');
    
    // Get all shape buttons
    const shapeButtons = document.querySelectorAll('.shape-btn[data-shape]');
    console.log('Found', shapeButtons.length, 'shape buttons');
    
    // Remove existing listeners by cloning each button
    shapeButtons.forEach(button => {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
    });
    
    // Add new listeners
    document.querySelectorAll('.shape-btn[data-shape]').forEach(button => {
        button.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            
            const shapeType = this.getAttribute('data-shape');
            console.log('Shape button clicked:', shapeType);
            
            if (shapeType && shapeType !== 'none') {
                // Use setTimeout to ensure we're not in the middle of another event
                setTimeout(() => addShape(shapeType), 0);
            }
        });
    });
}

// Modify the openHatMaker function to reset button listeners
function openHatMaker() {
    console.log('Opening hat maker');
    
    // Show the modal directly
    document.getElementById('hat-maker-modal').style.display = 'block';
    
    // Initialize the hat maker if not already done
    if (!hatMakerScene) {
        initHatMaker();
        
        // Reset shape button listeners after initialization
        resetShapeButtonListeners();
    } else {
        // Force resize and render of the hat maker preview
        setTimeout(function() {
            resizeHatMakerPreview();
            hatMakerRenderer.render(hatMakerScene, hatMakerCamera);
            
            // Reset shape button listeners
            resetShapeButtonListeners();
        }, 100);
    }
    
    console.log('Hat maker opened');
}

// Remove the setupShapeButtons function and its call from DOMContentLoaded
// Also remove the duplicate DOMContentLoaded listeners

// Keep only one DOMContentLoaded event listener
// This should be at the end of your file, replacing any existing ones
document.addEventListener('DOMContentLoaded', function() {
    console.log('Document loaded - setting up event listeners');
    
    // Set up keyboard controls
    setupKeyboardControls();
    
    // Initialize the hat maker button
    const openHatMakerBtn = document.getElementById('open-hat-maker');
    if (openHatMakerBtn) {
        // Remove existing listeners
        const newBtn = openHatMakerBtn.cloneNode(true);
        openHatMakerBtn.parentNode.replaceChild(newBtn, openHatMakerBtn);
        
        // Add new listener
        newBtn.addEventListener('click', function() {
            console.log('Open hat maker button clicked');
            openHatMaker();
        });
    }
    
    // Add a test button for debugging
    const existingTestBtn = document.getElementById('test-add-shape-btn');
    if (!existingTestBtn) {
        const testButton = document.createElement('button');
        testButton.id = 'test-add-shape-btn';
        testButton.textContent = 'Test Add Shape';
        testButton.style.position = 'fixed';
        testButton.style.bottom = '10px';
        testButton.style.right = '10px';
        testButton.style.zIndex = '1000';
        testButton.addEventListener('click', function() {
            if (hatMakerScene) {
                testAddShape();
            } else {
                console.error('Hat maker scene not initialized');
            }
        });
        document.body.appendChild(testButton);
    }
    
    // Register modals if ModalManager exists
    if (typeof ModalManager !== 'undefined') {
        ModalManager.register('hat-maker-modal', {
            closeOnOutsideClick: true,
            onOpen: function() {
                resizeHatMakerPreview();
                hatMakerRenderer.render(hatMakerScene, hatMakerCamera);
            }
        });
        
        ModalManager.register('save-hat-modal');
        ModalManager.register('dog-customization-modal');
    }
});
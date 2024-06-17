import { GUI } from 'dat.gui';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';

const loaderDiv = document.createElement('div');
loaderDiv.style.position = 'absolute';
loaderDiv.style.top = '50%';
loaderDiv.style.left = '50%';
loaderDiv.style.transform = 'translate(-50%, -50%)';
loaderDiv.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>';
document.body.appendChild(loaderDiv);

const loader = new OBJLoader();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 2);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xffffff);

const controls = new OrbitControls(camera, renderer.domElement);

const envTexture = new THREE.CubeTextureLoader().load([
    'img/gwg.png',
    'img/gwg.png',
    'img/white.png',
    'img/white.png',
    'img/gwg.png',
    'img/gwg.png',
])

// const envTexture = new THREE.CubeTextureLoader().load([
//     // Left face
//     // Right face
//     // Top face
//     // Bottom face
//     // Front face
//     // Back face
// ]);

envTexture.mapping = THREE.CubeReflectionMapping;

let object1: THREE.Object3D<THREE.Object3DEventMap>; 
let object2: THREE.Object3D<THREE.Object3DEventMap>; 
let charm: THREE.Object3D<THREE.Object3DEventMap>; 
let dia: THREE.Object3D<THREE.Object3DEventMap>; 

// Function to extract parameters from the URL
function getParameterByName(name: string, url: string = window.location.href) {
    name = name.replace(/[\[\]]/g, "\\$&");
    const regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

// Get parameters from the URL
const nameParam = getParameterByName('name') || 'Scarlet';
const fontId = Number(getParameterByName('font_id')) || 1;
const chainType = getParameterByName('chain_type');
const charmName = getParameterByName('charm_name');
const colorName = getParameterByName('color_name');
const stoneName = getParameterByName('stone_name');
console.log("charmName",charmName);
console.log("colorName",colorName);

let colors: { [key: string]: any } = {};
colors = {
    'yellow_gold': 0xF5DCA8,
    'silver': 0xDADADA,
    'rose_gold': 0xF8CEB8,
    'white_gold': 0xE7E9EB,
}
let matColor = 0xF8CEB8
if(colorName != null && colorName != "" && colorName != "null" && colorName != undefined && colors[colorName] != null){
    matColor = colors[colorName];   
}
const material = new THREE.MeshStandardMaterial({
    envMap: envTexture,
    metalness: 1.0,
    roughness: 0.05,
    color: matColor,
});

async function fetchData() {
    try {
        const response = await fetch('http://localhost:8000/word_generator_3D/char-config-three-d?f_id='+fontId+'&cn='+nameParam);
        if (!response.ok) {
            throw new Error('Failed to fetch parameters');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching parameters:', error);
        return null;
    }
}

let charmOffsetX: { [key: string]: any } = {};
async function initializeScene() {
    const data = await fetchData();
    if (data) {
        const fontConfig = data.data[0].font_config;
        const generatedWord = data.data[2].generated_word;
        const charSpacing = data.data[0].font_config.map((config: { character_spacing: any; }) => config.character_spacing);
        charmOffsetX = data.data[0].font_config.reduce((acc: {[key: string]: any}, config: { character_name: any; charm_location_x: any; }) => {
            acc[config.character_name] = config.charm_location_x;
            return acc;
        }, {});
        let offsets: { [key: string]: any } = {};
        offsets['left_x'] = data.data[0].font_config[0].chain_left_offset_x != null ? data.data[0].font_config[0].chain_left_offset_x : data.data[0].font_config[0].default_chain_left_offset_x;
        offsets['right_x'] = data.data[0].font_config[data.data[0].font_config.length - 1].chain_right_offset_x != null ? data.data[0].font_config[data.data[0].font_config.length - 1].chain_right_offset_x : data.data[0].font_config[data.data[0].font_config.length - 1].default_chain_right_offset_x;
        offsets['left_y'] = data.data[0].font_config[0].chain_left_offset_y != null ? data.data[0].font_config[0].chain_left_offset_y : data.data[0].font_config[0].default_chain_left_offset_y;
        offsets['right_y'] = data.data[0].font_config[data.data[0].font_config.length - 1].chain_right_offset_y != null ? data.data[0].font_config[data.data[0].font_config.length - 1].chain_right_offset_y : data.data[0].font_config[data.data[0].font_config.length - 1].default_chain_right_offset_y;
        
        loadAllObjects(generatedWord, new THREE.Vector3(0, 0, 0), charSpacing, offsets)
            .then(() => {
                loaderDiv.style.display = 'none';
                document.body.appendChild(renderer.domElement);
            })
            .catch((error) => {
                console.error('Error loading objects:', error);
                // Handle error, maybe show an error message or retry loading
            });
        
    } else {
        loaderDiv.innerHTML = 'Failed to fetch data';
    }
}

function loadAllObjects(generatedWord: string, position: THREE.Vector3, charSpacing: number[], offsets: { [key: string]: any }) {
    return new Promise<void>((resolve, reject) => {
        createTextGeometry(generatedWord, position, charSpacing, function (textWidth, firstCharHeight, lastCharHeight) {
            let jumperScales = [0.05, 0.05, 0.03];
            let chainScales = [0.05, 0.05, 0.05];
            let charmJumperScales = [0.08, 0.08, 0.01];
            let charmScales = [0.05, 0.05, 0.05];
            firstCharHeight = firstCharHeight - offsets['left_y'];
            let firstOffset = offsets['left_x'];
            let lastOffset = offsets['right_x'];
            lastCharHeight = lastCharHeight - offsets['right_y'];
            loadJumper(jumperScales, -textWidth, firstCharHeight, firstOffset);
            loadLeftChain(chainScales, textWidth, firstCharHeight, firstOffset);
            loadJumper(jumperScales, textWidth, lastCharHeight, lastOffset);
            if(charmName !== 'null' && charmName !== null && charmName !== undefined && charmName !== "") {
                loadCharmJumper(charmJumperScales, textWidth,charSpacing,generatedWord);
            }
            loadRightChain(chainScales, textWidth, lastCharHeight, lastOffset)
                .then(() => {
                    // const fileName = nameParam + '_screenshot.png';
                    // captureAndSaveScreenshot(fileName);
                    resolve(); // Resolve promise once all objects are loaded
                })
                .catch((error) => {
                    reject(error); // Reject promise if there's an error during loading
                });
            if(stoneName !== 'null' && stoneName !== null && stoneName !== undefined && stoneName !== "") {
                let stoneColor = 0xf44336
                console.log("stone",stoneName);
                
                if (stoneName == "green") {
                    stoneColor = 0x4caf50
                }
                if(generatedWord[0]=="A"){
                    loadStone([-0.7, 0.05, -0.01],stoneColor)
                }
                if(generatedWord[0]=="B"){
                    loadStone([-0.36, 0.049, -0.01],stoneColor)
                }
                if(generatedWord[0]=="C"){
                    loadStone([-0.33, 0.36, -0.01],stoneColor)
                }
            }
        });
    });
}

function loadStone(pos: number[],stoneColor: number) {
    loader.load(
        '/diamonds/cutos.obj',
        function (loadedObject) {
            dia = loadedObject;
            dia.scale.set(0.00045, 0.00045, 0.00045);
            dia.position.set(pos[0], pos[1], pos[2]);
            dia.rotation.set(1.4, 0, 0);

            // Apply a physically-based material for better reflection
            const material = new THREE.MeshPhysicalMaterial({
                color: stoneColor, // Color of the diamond
                envMap: envTexture,
                metalness: 1.0, // Fully metallic
                roughness: 0, // Low roughness for a shiny surface
                // clearcoat: 1.0, // Diamond-like clearcoat
                // transmission: 1.0, // Diamond-like transmission (for refraction)
                // envMapIntensity: 1.0, // Intensity of environment map reflection
                reflectivity: 1.0, // Reflectivity of the surface
            });

            // Traverse through all the children and apply the material
            dia.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    child.material = material;
                }
            });

            // Add the loaded dia to the scene
            scene.add(dia);
        },
        function (xhr) {
            // Called while loading is progressing
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        function (error) {
            // Called when loading has errors
            console.error('An error happened', error);
        }
    );
}

function createTextGeometry(text: string, position: THREE.Vector3, characterSpacing: number[], callback: (width: number, firstCharHeight: number, lastCharHeight: number) => void) {
    let textWidth = 0;
    const loader = new FontLoader();
    const letterSpacing = Number(characterSpacing) || -0.05;
    
    loader.load('./fonts/Niconne_Regular.json', function (font) {
        let firstCharHeight = 0;
        let lastCharHeight = 0;
        for (let i = 0; i < text.length; i++) {
            const character = text.charAt(i);
            const textGeometry = new TextGeometry(character, {
                font: font,
                size: 0.5, 
                height: 0.01,
                curveSegments: 50, // Number of points on the curves
                // bevelEnabled: true, // Enable bevel
                // bevelThickness: 0.002, // Thickness of the bevel
                // bevelSize: 0.002, // Size of the bevel
                // bevelSegments: 5 // Number of bevel segments 
            });
            textGeometry.computeBoundingBox(); 
            const textMaterial = material; 
            const textMesh = new THREE.Mesh(textGeometry, textMaterial);
            let width = 0;
            let belowBaseline = 0;
            if (textGeometry.boundingBox !== null) {
                width = textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x + characterSpacing[i];
                if(i==0){
                    belowBaseline = Math.max(0, -textGeometry.boundingBox.min.y);
                    firstCharHeight = textGeometry.boundingBox.max.y - textGeometry.boundingBox.min.y - belowBaseline;
                }
                if(i==text.length-1){
                    belowBaseline = Math.max(0, -textGeometry.boundingBox.min.y);
                    lastCharHeight = textGeometry.boundingBox.max.y - textGeometry.boundingBox.min.y - belowBaseline;
                }
            }
            textMesh.position.copy(position.clone().add(new THREE.Vector3(textWidth, 0, 0)));
            textWidth += width; 
            // if(middleChar !== 0 && textWidth >= middleChar){
            //     return text[i];
            // }

            scene.add(textMesh);
        }
        const xOffset = -textWidth / 2;
        scene.children.forEach(child => {
            if (child instanceof THREE.Mesh) {
                child.position.x += xOffset;
            }
        });
        callback(textWidth, firstCharHeight, lastCharHeight);
    });
}

function getMiddleChar(middleWidth: number, text: string, characterSpacing: number[], callback: (char: string, width: number,middleCharHeight: number) => void) {
    console.log("middleWidth", middleWidth);
    console.log("text", text);
    console.log("characterSpacing", characterSpacing);
    
    let textWidth = 0;
    const loader = new FontLoader();
    
    loader.load('./fonts/Niconne_Regular_New.json', function (font) {
        for (let i = 0; i < text.length; i++) {
            const character = text.charAt(i);
            const textGeometry = new TextGeometry(character, {
                font: font,
                size: 0.5, 
                height: 0.01,
            });
            textGeometry.computeBoundingBox(); 
            let width = 0;
            let belowBaseline = 0;
            let middleCharHeight = 0;
            if (textGeometry.boundingBox !== null) {
                width = textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x + characterSpacing[i];
            }
            textWidth += width; 
            if(middleWidth !== 0 && textWidth >= middleWidth){
                if (textGeometry.boundingBox !== null) {
                    belowBaseline = Math.max(0, -textGeometry.boundingBox.min.y);
                    middleCharHeight = textGeometry.boundingBox.max.y - textGeometry.boundingBox.min.y - belowBaseline;
                }
                return callback(text[i],width,middleCharHeight);
            }

        }
    });
}

let chain_url_left = '/Chain&Charms/chains (.obj -10)/chain/paper_clip/left.obj';
if (chainType != "undefined" && chainType != null){
    chain_url_left = '/Chain&Charms/chains (.obj -10)/chain/'+chainType+'/left.obj'
}
function loadLeftChain(scales: number[], textWidth: number, firstCharHeight: number, firstOffsetX: number) {
    loader.load(
        chain_url_left,
        function (loadedObject) {
            object1 = loadedObject; 
            object1.scale.set(scales[0], scales[1], scales[2]);
            const chain1X = -(textWidth / 2) + firstOffsetX; 
            object1.position.set(chain1X, firstCharHeight, 0);

            object1.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    child.material = material;
                }
            });

            scene.add(object1);
        },
        function (xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        function (error) {
            console.error('An error happened', error);
        }
    );
}

let chain_url_right = '/Chain&Charms/chains (.obj -10)/chain/paper_clip/right.obj';
if (chainType != "undefined" && chainType != null){
    chain_url_right = '/Chain&Charms/chains (.obj -10)/chain/'+chainType+'/right.obj'
}
function loadRightChain(scales: number[], textWidth: number, lastCharHeight: number, lastOffsetX: number) {
    return new Promise<void>((resolve, reject) => {
        console.log(lastOffsetX,"lastOffsetX");
        
        loader.load(
            chain_url_right,
            function (loadedObject) {
                object2 = loadedObject; 
                object2.scale.set(scales[0], scales[1], scales[2]);
                const chain2X = (textWidth / 2) + lastOffsetX; 
                object2.position.set(chain2X, lastCharHeight, 0);
    
                object2.traverse(child => {
                    if (child instanceof THREE.Mesh) {
                        child.material = material;
                    }
                });
    
                scene.add(object2);
            },
            function (xhr) {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
                resolve();
            },
            function (error) {
                console.error('An error happened', error);
            }
        );
    });
}

function loadJumper(scales: number[], width: number, height: number, Offset: number) {
    loader.load(
        'Chain&Charms/chain_jumpering(.obj-2)/chainJumpring.obj',
        function (loadedObject) {
            object2 = loadedObject; 
            object2.scale.set(scales[0], scales[1], scales[2]);
            const chain2X = (width / 2) + Offset; 
            object2.position.set(chain2X, height, 0);

            object2.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    child.material = material;
                }
            });

            scene.add(object2);
        },
        function (xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        function (error) {
            console.error('An error happened', error);
        }
    );
}

function loadCharmJumper(scales: number[], width: number, charSpacing:number[], generatedWord: string) {
    console.log("width", width);
    getMiddleChar(width/2, generatedWord, charSpacing, function (char: string, width: number, middleCharHeight: number) {
        console.log("width",width);
        
        console.log("middleChar", char);
        console.log("charmOffsetX",charmOffsetX);
        
        loader.load(
            '/Chain&Charms/chain_jumpering(.obj-2)/charmJumpring.obj',
            function (loadedObject) {
                charm = loadedObject; 
                charm.scale.set(scales[0], scales[1], scales[2]);
                let xpos = charmOffsetX[char] !== undefined && charmOffsetX[char] !== null ? charmOffsetX[char] : 0;
                let ypos = 0.04-middleCharHeight/2;
                
                charm.position.set(0.08+xpos, 0.04, 0);
    
                charm.traverse(child => {
                    if (child instanceof THREE.Mesh) {
                        child.material = material;
                    }
                });
    
                scene.add(charm);
                loadCharm([0.08+xpos, 0, 0]);
            },
            function (xhr) {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            function (error) {
                console.error('An error happened', error);
            }
        );
    })
    

    
}

function loadCharm(charmPositions: number[]) {
    // let charmName = 'Heart';
    loader.load(
        'Chain&Charms/charms_24/'+charmName+'.obj',
        function (loadedObject) {
            charm = loadedObject; 
            charm.scale.set(0.05, 0.05, 0.05);
            charm.position.set(charmPositions[0], charmPositions[1], charmPositions[2]);

            charm.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    child.material = material;
                }
            });

            scene.add(charm);
        },
        function (xhr) {
            // Called while loading is progressing
            console.log('charm '+ (xhr.loaded / xhr.total * 100) + '% loaded');
        },
        function (error) {
            // Called when loading has errors
            console.error('An error happened', error);
        }
    );
}


const ambientLight = new THREE.AmbientLight(0xffffff, 1); 
scene.add(ambientLight);

// document.addEventListener('wheel', onMouseWheel, { passive: false });
window.addEventListener('resize', onWindowResize);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// var minFOV = 3; 
// var maxFOV = 7; 
// camera.fov = maxFOV;

// function onMouseWheel(event: { preventDefault: () => void; deltaY: number; }) {
//     event.preventDefault();

//     var fov = camera.fov + event.deltaY * 0.05; 
//     camera.fov = Math.max(minFOV, Math.min(maxFOV, fov));
//     camera.updateProjectionMatrix();
// }

function animate() {
    requestAnimationFrame(animate);
    controls.minZoom = 1;
    controls.maxZoom = 2;
    controls.update();
    renderer.render(scene, camera);
}

initializeScene();
animate();

function captureAndSaveScreenshot(fileName: string) {
    requestAnimationFrame(function () {
        const target = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
        renderer.setRenderTarget(target);
        renderer.render(scene, camera);

        renderer.domElement.toBlob(function (blob) {
            if (blob !== null) {
                const link = document.createElement('a');
                link.download = fileName;
                link.href = URL.createObjectURL(blob);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }

            renderer.setRenderTarget(null);
        }, 'image/png');
    });
}

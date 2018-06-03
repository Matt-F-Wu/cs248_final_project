var width = 640;
var height = 480;

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, width/height, 0.1, 1000 );

var renderer = new THREE.WebGLRenderer({alpha: true});
renderer.setSize(width, height);
renderer.setClearColor(0x000000, 0);

var canvas = document.getElementById("layers").appendChild( renderer.domElement );
canvas.style.opacity = 0.99; // ???
// canvas.style.position = "absolute"; ?

var geometry = new THREE.BoxGeometry( 1, 1, 1 );
var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
var cube = new THREE.Mesh( geometry, material );
scene.add( cube );

camera.position.z = 5;

var animate = function () {
  requestAnimationFrame( animate );

  cube.rotation.x += 0.1;
  cube.rotation.y += 0.1;

  renderer.render( scene, camera );
};

animate();

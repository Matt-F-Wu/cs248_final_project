var width = 640;
var height = 480;

var scene = new THREE.Scene();

var camera = new THREE.PerspectiveCamera( 75, width/height, 0.1, 1000 );
camera.position.set(0, 0, 50);

var renderer = new THREE.WebGLRenderer({alpha: true, antialias: true});
renderer.setSize(width, height);
renderer.setClearColor(0x000000, 0.0);

var canvas = document.getElementById("layers").appendChild( renderer.domElement );
//canvas.style.opacity = 0.999; // ???

var light = new THREE.DirectionalLight( 0xffffff );
light.position.set( 0, 1, 0 ).normalize();
scene.add(light);

// hyperparameters for the particle system
var direction = new THREE.Vector3(0, 1, 0),
    source = new THREE.Vector3(0, 0, 0),
    hide = new THREE.Vector3(1000, 1000, 0),
    particleCount = 200,
    gesture = 0,
    rate = 1,
    life = 60,
    speed = 1.5,
    spread = 0.2;

var particles = new THREE.Geometry(),
    pMaterial = new THREE.PointsMaterial({
      color: 0x0000FF,
      size: 5,
      map: new THREE.TextureLoader().load(
        "images/snow.png"
      ),
      blending: THREE.AdditiveBlending,
      transparent: true
    });

function initializeParticle(particle, position) {
  particle.t = 0;
  particle.v = direction.clone().normalize();
  particle.v.multiplyScalar(speed * Math.random());
  particle.v.x += spread * (Math.random() - 0.5); // TODO
  particle.a = 0;
  particle.set(position.x, position.y, position.z);
}

var particlePool = [],
    particleEmitted = [];

for (var p = 0; p < particleCount; p++) {
  var particle = new THREE.Vector3();
  initializeParticle(particle, hide);
  particles.vertices.push(particle);
  particlePool.push(particle);
}

var particleSystem = new THREE.Points(particles, pMaterial);
scene.add(particleSystem);

var animate = function () {
  requestAnimationFrame( animate );

  //direction.applyAxisAngle(new THREE.Vector3(0, 0, 1), 0.01);
  source.add(new THREE.Vector3(1, 1, 1).multiplyScalar(Math.random() - 0.5))

  // emit new particles
  for (var i = 0; i < rate; i++) {
    if (particlePool.length > 0) {
      var particle = particlePool[particlePool.length - 1];
      initializeParticle(particle, source);
      particlePool.pop();
      particleEmitted.push(particle);
    }
  }

  // update emitted particles
  var particleEmitted_new = []
  for (var i = 0; i < particleEmitted.length; i++) {
    var particle = particleEmitted[i];
    particle.t += 1;
    particle.add(particle.v);
    if (particle.t > life) {
      initializeParticle(particle, hide);
      particlePool.push(particle);
    } else {
      particleEmitted_new.push(particle);
    }
  }
  particleEmitted = particleEmitted_new;

  particles.verticesNeedUpdate = true;

  renderer.render( scene, camera );
};

animate();

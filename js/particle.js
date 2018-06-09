var camera, tick = 0,
      scene, renderer, clock = new THREE.Clock(),
      controls, container,
      options, spawnerOptions, particleSystem, light, baselt;

    function handleMouseMove(event){
      if(!useAI){
        let x_c = window.innerWidth / 2;
        let y_c = window.innerHeight / 2;
        let x_diff = event.clientX - x_c;
        let y_diff = event.clientY - y_c;
        // If within range
        if(Math.abs(x_diff) < 320 && Math.abs(y_diff) < 240){
          direction.x = x_diff;
          direction.y = -y_diff;
          direction.normalize();
        }
      }
    }

    document.onmousemove = handleMouseMove;

    init();
    animate();

    function init() {

      //

      container = document.getElementById( 'layers' );

      container.style.height = window.innerHeight + 'px';
      container.style.width = 4/3 * window.innerHeight + 'px';

      var videoDisp = document.getElementById( 'canvas' );
      videoDisp.style.height =  container.style.height;
      videoDisp.style.width =  container.style.width;

      console.log("Particle");

      camera = new THREE.PerspectiveCamera( 28, 640 / 480, 1, 1000 );
      camera.position.z = 100;

      var vector = new THREE.Vector3( 1, 1, -1 ).unproject( camera );

      scene = new THREE.Scene();

      // The GPU Particle system extends THREE.Object3D, and so you can use it
      // as you would any other scene graph component.  Particle positions will be
      // relative to the position of the particle system, but you will probably only need one
      // system for your whole scene

      particleSystem = new THREE.GPUParticleSystem( {
        maxParticles: 250000
      } );

      scene.add( particleSystem );

      light = new THREE.DirectionalLight( 0xffffff );
      light.position.set( 0, 1, 0 ).normalize();
      scene.add(light);

      /*
      options passed during each spawned!
      Hao:
      Position is the position of the new particle.
      We can change the position every time we spawn
      instead of moving particles around, we can simply
      let the old ones die (lifetime), and draw new ones
      at new positions to give the illusion that particles are moving
      */

      options = {
        rotationSpeed: 8,
        position: new THREE.Vector3(0.0, 0.0, 0.0),
        containerCount: 1000,
        positionRandomness: 1.5,
        smoothPosition: false,
        velocity: new THREE.Vector3(),
        velocitySpeed: 2,
        velocityRandomness: 0.5,
        color: 0xffa0a0,
        colorRandomness: 5,
        turbulence: 0.1,
        lifetime: 5,
        size: 15,
        sizeRandomness: 2,
        x_threshold: vector.x,
        y_threshold: vector.y,
        rotationSpeed: 16,
      };

      baselt = options.lifetime;

      spawnerOptions = {
        spawnRate: 1000,
        horizontalSpeed: 1.5,
        verticalSpeed: 1.33,
        timeScale: 1
      };

      // Rederer

      renderer = new THREE.WebGLRenderer({alpha: true, antialias: true});
      renderer.setPixelRatio( window.devicePixelRatio );
      renderer.setSize( container.clientWidth, container.clientHeight );
      renderer.setClearColor(0x000000, 0.0); // TODO: 1.0->0.0
      container.appendChild( renderer.domElement );

      window.addEventListener( 'resize', onWindowResize, false );

    }

    function onWindowResize() {

      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();

      renderer.setSize( window.innerWidth, window.innerHeight );

    }

    function animate() {

      requestAnimationFrame( animate );

      // Hao: Some variance in number of particles spawned
      var delta = clock.getDelta() * spawnerOptions.timeScale;

      tick += delta;

      if ( tick < 0 ) tick = 0;

      if ( delta > 0 ) {
        let r = Math.random() * Math.PI;
        options.velocity.copy(direction);
        options.velocity.multiplyScalar(options.velocitySpeed);
        for ( var x = 0; x < spawnerOptions.spawnRate * delta; x++ ) {
          // Spawn new particles
          options.lifetime = baselt * (Math.random() + 0.5);
          let pContainer = particleSystem.spawnParticle( options );
        }

      }

      //Hao: Update particle time, this relates to life time and such
      particleSystem.update( tick );

      render();

    }

    function render() {

      renderer.render( scene, camera );

    }

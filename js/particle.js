var camera, tick = 0,
      scene, renderer, clock = new THREE.Clock(),
      controls, container,
      options, spawnerOptions, particleSystem, light, baselt;

    init();
    animate();

    function init() {

      //

      container = document.getElementById( 'layers' );

      camera = new THREE.PerspectiveCamera( 28, window.innerWidth / window.innerHeight, 1, 10000 );
      camera.position.z = 100;

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
        position: new THREE.Vector3(),
        containerCount: 100,
        positionRandomness: 0.0,
        smoothPosition: false,
        velocity: new THREE.Vector3(),
        velocityRandomness: 0.5,
        color: 0xaa88ff,
        colorRandomness: .2,
        turbulence: 0.0,
        lifetime: 6,
        size: 20,
        sizeRandomness: 1
      };

      baselt = options.lifetime;

      spawnerOptions = {
        spawnRate: 10000,
        horizontalSpeed: 1.5,
        verticalSpeed: 1.33,
        timeScale: 1
      };

      // Rederer

      renderer = new THREE.WebGLRenderer({alpha: true, antialias: true});
      renderer.setPixelRatio( window.devicePixelRatio );
      renderer.setSize( container.clientWidth, container.clientHeight );
      renderer.setClearColor(0x000000, 0.0);
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
        //options.position.multiplyScalar(Math.random()*4.0 - 2.0);
        let r = Math.random() * Math.PI;
        options.velocity.set(1., 0., 0.0).normalize();
        // Give particles arbitary life
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
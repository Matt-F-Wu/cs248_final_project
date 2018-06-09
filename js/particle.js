var camera, tick = 0,
      scene, renderer, clock = new THREE.Clock(),
      controls, container,
      options, spawnerOptions, particleSystem, light, baselt, useAI = false,
      direction = new THREE.Vector3(1, 0, 0);

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
        // position: new THREE.Vector3(-20, 0, 0),
        // positionRandomness: .3,
        // velocity: new THREE.Vector3(10, 0, 0),
        // velocityRandomness: 1,
        // // TODO 加一个向心加速度，然后根据 position、velocity 和当前位置来确定加速度方向
        // color: 0x000000,
        // colorRandomness: 1,
        // turbulence: 0,
        // lifetime: 20,
        // size: 8,
        position: new THREE.Vector3(0.0, 0.0, 0.0),
        containerCount: 1000,
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
        spawnRate: 5000,
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
        offset = 0
        options.position.addScalar(Math.random() * offset- offset / 2);
        let r = Math.random() * Math.PI;
        options.velocity.copy(direction);
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

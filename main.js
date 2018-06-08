var app = angular.module('mainApp', ['ngResource']);

app.controller('MainController', ['$scope', '$resource', function($scope, $resource) {
    $scope.hand_control = true;

    var Predict = $resource('http://localhost:8080/prediction');
    var blocking = false;
    
    function imageToDataUri(img, width, height) {
        var canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');

        // set its dimension to target size
        canvas.width = width;
        canvas.height = height;

        // draw source image into the off-screen canvas:
        ctx.drawImage(img, 0, 0, width, height);

        // encode image to data-uri with base64 version of compressed image
        return canvas.toDataURL('image/jpeg', 0.8);
    }

    var Gesture = function(){
    };

    Gesture.prototype.start = function() {
      var that = this;

      this.tracker = new HT.Tracker( {fast: true} );

      this.cbxHull = document.getElementById("cbxHull");
      this.cbxDefects = document.getElementById("cbxDefects");
      this.cbxSkin = document.getElementById("cbxSkin");

      this.video = document.getElementById("video");
      this.canvas = document.getElementById("canvas");
      this.context = this.canvas.getContext("2d");

      this.canvas.width = parseInt(this.canvas.style.width);
      this.canvas.height = parseInt(this.canvas.style.height);

      this.image = this.context.createImageData(
        this.canvas.width, this.canvas.height);

      /*Get user's webcam handle*/
      navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

      if (navigator.getUserMedia){
        navigator.getUserMedia({video:true},
          function(stream){ return that.videoReady(stream); },
          function(error){ return that.videoError(error); } );
      }
    };

    Gesture.prototype.videoReady = function(stream){
      if (window.webkitURL) {
        this.video.src = window.webkitURL.createObjectURL(stream);
      } else if (video.mozSrcObject !== undefined) {
        this.video.mozSrcObject = stream;
      } else {
        this.video.src = stream;
      }

      this.tick();
    };

    Gesture.prototype.videoError = function(error){
    };

    Gesture.prototype.p2d = [];
    Gesture.prototype.p3d = [];

    Gesture.prototype.tick = function(){
      var that = this, image, candidate;

      /* Continuously track hand movements per animation frame*/
      if($scope.hand_control) {
        requestAnimationFrame( function() { return that.tick(); } );
      }

      if (this.video.readyState === this.video.HAVE_ENOUGH_DATA){
        image = this.snapshot();
        //console.log("image str: ", image);
        /* Abtain a medium quality jpg image to send to backend */
        if(!blocking){
          blocking = !blocking;
          Predict.save({}, {img: image}).$promise.then(function(joints) {
            if(!joints){
              //If joints returned is empty, don't do anything
              blocking = false;
              return;
            }
            that.p2d = joints.p2d;
            that.p3d = joints.p3d;
            let scaling = 1 / 224 * this.canvas.width;
            if(direction){
              // Use index and middle finger to find direction
              let x = (that.p2d[3][0] - that.p2d[1][0]) + (that.p2d[7][0] - that.p2d[5][0]);
              x *= scaling;
              let y = (that.p2d[3][1] - that.p2d[1][1]) + (that.p2d[7][1] - that.p2d[5][1]);
              y *= scaling;
              direction.set(x, y, -1).normalize();
            }
            if(source){
              source.set(that.p2d[20][0], that.p2d[20][1], 0);
            }
            //** Obtained  **//
            // console.log(that.p2d);
            // that.drawJoints(that.p2d);
            // Processing finished, no longer blocking
            blocking = false;
          });
        }
        that.drawJoints(that.p2d);
        //candidate = this.tracker.detect(image);
        //this.draw(candidate);
      }
    };

    Gesture.prototype.drawJoints = function(p2d){
      var self = this;
      self.context.fillStyle="#FF0000";
      p2d.forEach((p, i) => {
        self.context.fillRect(p[0] / 224 * this.canvas.width, p[1] / 224 * this.canvas.height, 8, 8);
      });
    }

    Gesture.prototype.snapshot = function(){
      this.context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

      return imageToDataUri(this.video, 224, 224);
    };

    window.onload = function(){
      var gesture = new Gesture();
      gesture.start();
    };

  }]);
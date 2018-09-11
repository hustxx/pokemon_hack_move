var App = function(lat, lng) {
  this.init = function() {
    function initMap(){
      this.map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: lat, lng: lng},
        zoom: 16
      });
    }

    initMap.bind(this)();
    this.listenToMapChange();
    this.listenToCitySelect();
    this.listenToAddress();
    this.listenToLocation();
    this.listenToKeyPress();
    this.listenToMove();
    this.delLast();
    this.setSpeed();
    this.setMultiMove();

    $('#stop-walking').click(function(){
      this.stopWalking();
    }.bind(this));

    $('#start-walking').click(function(){
      this.startWalk(0, 1);
    }.bind(this));

    $('#repeat-walking').click(function(){
      this.startMultiWalk(0, 1);
    }.bind(this));
  };

  this.flightPath = null;
  this.currWalkingSteps = 0;
  this.currWalkingInstance = null;
  this.currWalkingInstanceMarker = null;
  this.totalWalkingDistance = 0;
  this.map = null;
  this.speed = 2.0;
  this.currLocation = {
    lat: lat,
    lng: lng
  };
  // add multi dest array
  this.multiDest = [];
  this.inMove = false;

  this.getCurrentLocation = function() {
    return this.currLocation;
  };

  this.getLocationByAddress = function(address, callback) {
    $.ajax({
      type : "GET",
      url : "https://maps.googleapis.com/maps/api/geocode/json?address="+address.replace(/ /g, "+"),
      dataType : "JSON",
      success: function(data){
        callback(data.results[0].geometry.location);
      }
    });
  }

  this.getAddressByLocation = function(loc, callback) {
    $.ajax({
      type : "GET",
      url : "https://maps.googleapis.com/maps/api/geocode/json?latlng="+loc+"&sensor=true",
      dataType : "JSON",
      success: function(data){
        callback(data.results[0].formatted_address);
      }
    });
  }

  this.locationToString = function() {
    return this.currLocation.lat + ',' + this.currLocation.lng;
  }

  this.updateGPSStorage = function(location) {
    this.currLocation = {lat: location.lat, lng: location.lng};
  };

  this.updateFrontEnd = function() {
    function updateMap(location){
      this.map.setCenter(location);
    }

    this.getAddressByLocation(this.locationToString(), function(address){
      $("#address").val(address);
    });

    $("#latitude").val(this.currLocation.lat);
    $("#longitude").val(this.currLocation.lng);

    updateMap.bind(this)(this.currLocation);
  };

  this.updateGPX = function() {
    $.ajax({
      type : "POST",
      url : "/update",
      data : {
        lat: this.currLocation.lat,
        lon: this.currLocation.lng
      },
      dataType : "JSON"
    });
    // The following is for updating the pokemon locations
    /*
    $.ajax({
      type : "GET",
      url : "http://localhost:5000/override_loc?lat=" + this.currLocation.lat + "&lon=" + this.currLocation.lng,
      dataType : "JSON"
    });
    */
  };

  this.updateMultiGPX = function() {
    $.ajax({
      type : "POST",
      url : "/multi_update",
      data : {
        mdest: JSON.stringify(this.multiDest),
        speed: this.speed
      },
      dataType : "JSON"
    });
  };

  this.setNewLocation = function(location) {
    this.updateGPSStorage(location);
    this.updateFrontEnd();
    this.updateGPX();
  };

  this.walkingToDestination = function(origin, destination) {
    // Latitude: 1 deg = 110.574 km
    // Longitude: 1 deg = 111.320*cos(latitude) km

    // reset if another destination is chosen
    clearInterval(this.currWalkingInstance);

    // reset if another destination is chosen
    if (this.currWalkingInstanceMarker) {
      this.currWalkingInstanceMarker.setMap(null);
    }

    // set marker
    this.currWalkingInstanceMarker = new google.maps.Marker({
      position: destination,
      map: this.map,
      title: 'Destination'
    });

    // calculate coordinates differences
    var latDiff = destination.lat() - origin.lat();
    var lngDiff = destination.lng() - origin.lng();

    // calculate distance in meters using google maps api
    // assume you can run 5 m/s, that's 18km/hr, pretty fast but reasonable
    // change it to 2m/s, that is 7.2km/hr, which is much safer
    var service = new google.maps.DistanceMatrixService();
    service.getDistanceMatrix({
      origins: [origin],
      destinations: [destination],
      travelMode: google.maps.TravelMode.WALKING
    }, function(response) {
      var results = response.rows[0].elements;
      var plannedDistance = results[0].distance.value;
      var steps = plannedDistance / 3;

      var latPerStep = latDiff / steps;
      var lngPerStep = lngDiff / steps;

      this.currWalkingSteps = 0;

      this.currWalkingInstance = setInterval(function() {
        this.totalWalkingDistance += 3;
        this.currWalkingSteps++;

        this.currLocation = {
          lat: this.currLocation.lat + latPerStep,
          lng: this.currLocation.lng + lngPerStep
        };

        this.setNewLocation(this.currLocation);

        if (this.currWalkingSteps > steps) {
          clearInterval(this.currWalkingInstance);
          this.currWalkingInstanceMarker.setMap(null);
        }
      }.bind(this), 1000); // 5 m/s
    }.bind(this));
  };

  this.walkingMultiDest = function(origin, destination) {
    // Latitude: 1 deg = 110.574 km
    // Longitude: 1 deg = 111.320*cos(latitude) km
    //origin = this.multiDest[fisrt];
    //destination = this.multiDest[second]
    // reset if another destination is chosen
    clearInterval(this.currWalkingInstance);

    // reset if another destination is chosen
    if (this.currWalkingInstanceMarker) {
      this.currWalkingInstanceMarker.setMap(null);
    }

    // set marker
    //this.currWalkingInstanceMarker = new google.maps.Marker({
    //  position: destination,
    //  map: this.map,
    //  title: 'Destination'
    //});

    // calculate coordinates differences
    var latDiff = destination.lat() - origin.lat();
    var lngDiff = destination.lng() - origin.lng();

    // calculate distance in meters using google maps api
    // assume you can run 5 m/s, that's 18km/hr, pretty fast but reasonable
    // change it to 2m/s, that is 7.2km/hr, which is much safer
    var service = new google.maps.DistanceMatrixService();
    service.getDistanceMatrix({
      origins: [origin],
      destinations: [destination],
      travelMode: google.maps.TravelMode.WALKING
    }, function(response) {
      var results = response.rows[0].elements;
      var plannedDistance = results[0].distance.value;
      var steps = plannedDistance / 3;

      var latPerStep = latDiff / steps;
      var lngPerStep = lngDiff / steps;

      this.currWalkingSteps = 0;

      this.currWalkingInstance = setInterval(function() {
        this.totalWalkingDistance += 3;
        this.currWalkingSteps++;

        this.currLocation = {
          lat: this.currLocation.lat + latPerStep,
          lng: this.currLocation.lng + lngPerStep
        };

        this.setNewLocation(this.currLocation);

        if (this.currWalkingSteps > steps) {
          clearInterval(this.currWalkingInstance);
          //this.currWalkingInstanceMarker.setMap(null);
          if (this.multiDest.length > 1) {
            this.walkingMultiDest(destination, origin);
          }
        }
      }.bind(this), 1000); // 5 m/s
    }.bind(this));
  };


  this.stopWalking = function() {
    this.multiDest = [];

    clearInterval(this.currWalkingInstance);

    if (this.currWalkingInstanceMarker) {
      this.currWalkingInstanceMarker.setMap(null);
    }
    this.updateMultiDests();
  };

  this.updateMultiDests = function() {
    allDests = "";
    for (var i = 0; i < this.multiDest.length; i++) {
        allDests = allDests + i + ": "+ this.multiDest[i] + "\n";
    }
    $("#multi").val(allDests);
    $("#multi1").val(this.multiDest[this.multiDest.length - 1]);
    if (this.flightPath) {
        this.flightPath.setMap(null);
    }
    this.flightPath = new google.maps.Polyline({
          path: this.multiDest,
          geodesic: true,
          strokeColor: '#FF0000',
          strokeOpacity: 1.0,
          strokeWeight: 2
        });
    this.flightPath.setMap(this.map);
  }


  this.addMultiLoc = function(new_dest) {
    if (this.currWalkingInstanceMarker) {
        this.currWalkingInstanceMarker.setMap(null);
    }
    this.currWalkingInstanceMarker = new google.maps.Marker({
          position: new_dest,
          map: this.map,
          title: 'Destination'
     });
    if (this.multiDest.length == 0) {
        this.multiDest.push(this.map.getCenter());
    }
    this.multiDest.push(new_dest);
    this.updateMultiDests();
  };

  /*this.chooseLocation = function() {
    this.map.addListener('click', function(event) {
        this.addMultiLoc(this.map.getCenter());
    }.bind(this));
  };
  */
  this.deleteLast = function () {
    this.multiDest.pop();
    this.updateMultiDests();
  };

  this.startWalk = function (cur, next) {
    if (this.multiDest.length < 1) {
        return;
    }
    // start walking
    this.walkingToDestination(this.multiDest[cur], this.multiDest[next]);
    //}
    // end walking
    this.multiDest = [];
    $("#multi0").val(this.multiDest[0]);
    $("#multi1").val(this.multiDest[1]);
  };

  this.startMultiWalk = function (cur, next) {
    if (this.multiDest.length < 1) {
        return;
    }
    this.walkingMultiDest(this.multiDest[cur], this.multiDest[next]);
    //}
    // end walking
  };

  this.listenToMapChange = function() {
    /*this.map.addListener('mouseup', function() {
      this.setNewLocation({lat: this.map.getCenter().lat(), lng: this.map.getCenter().lng()});
    }.bind(this));
*/
    this.map.addListener('click', function(event) {
        this.addMultiLoc(event.latLng);
    }.bind(this));

    /*this.map.addListener('click', function(event) {
      this.walkingToDestination(this.map.getCenter(), event.latLng);
    }.bind(this));
    */
  };

  this.listenToCitySelect = function() {
    $("#location-change-button").click(function(){
      var context = this;
      this.getLocationByAddress($('#location-select').val(), function(result){
        context.setNewLocation(result);
      });
    }.bind(this));
  };

  this.listenToAddress = function() {
    $("#address-button").click(function(){
      var context = this;
      this.getLocationByAddress($('#address').val(), function(result){
        context.setNewLocation(result);
      });
    }.bind(this));
  };

  this.listenToMove = function() {
    $("#move-button").click(function(){
      var move_loc = this.multiDest[this.multiDest.length - 1];
      this.multiDest = [];
      this.setNewLocation({lat:move_loc.lat(), lng:move_loc.lng()});
      this.updateMultiDests();
    }.bind(this));
  };

  this.delLast = function() {
    $("#del-last").click(function(){
        this.deleteLast();
    }.bind(this));
  };

  this.setSpeed = function() {
    $("#set-speed").click(function(){
        this.speed = $("#speed").val();
        //$("#multi1").val(this.speed);
    }.bind(this));
  };

  this.setMultiMove = function() {
    $("#multi-move").click(function(){
      //$("#multi1").val(this.speed);
      this.updateMultiGPX();
    }.bind(this));
  };

  this.listenToLocation = function() {
    $("#location-button").click(function(){
      var cur_loc = $('#latandlong').val();
      var split = cur_loc.indexOf(',');
      this.setNewLocation({lat:parseFloat(cur_loc.substr(0, split)), lng:parseFloat(cur_loc.substr(split + 1))});
      //this.setNewLocation({lat:parseFloat($('#latitude').val()), lng:parseFloat($('#longitude').val())});
    }.bind(this));
  };

  this.listenToKeyPress = function() {
    function changeCurrentLocationOnKey(direction, location) {
      var newLocation;

      function moveInterval() {
        var randomNum = parseInt(10 * Math.random());
        var number = "0.000" + (100 + randomNum);
        return parseFloat(number);
      }

      if (direction == "left") {
        location.lng -= moveInterval();
      } else if (direction == "right") {
        location.lng += moveInterval();
      } else if (direction == "up") {
        location.lat += moveInterval();
      }  else if (direction == "down") {
        location.lat -= moveInterval();
      }

      return {lat: location.lat, lng: location.lng};
    }

    $(document).keyup(function(e){
      var direction = "";
      switch (e.keyCode) {
        case 38:
          direction = "up";
          break;
        case 40:
          direction = "down";
          break;
        case 37:
          direction = "left";
          break;
        case 39:
          direction = "right";
          break;

      }
      
      if(direction !== "") {
        this.currLocation = changeCurrentLocationOnKey(direction, this.currLocation);
        this.setNewLocation(this.currLocation);
      }
    }.bind(this));
  };

  this.init();
};

$('document').ready(function() {
  var START_LATITUDE = "37.3239";
  var START_LONGTITUDE = "-121.9144";
  var START_LOC = START_LATITUDE + "," + START_LONGTITUDE;
  $("#latandlong").val(START_LOC);
  $("#latitude").val(START_LATITUDE);
  $("#longitude").val(START_LONGTITUDE);
  //$("#address").val("Enter address here...");
  var app = new App(parseFloat(START_LATITUDE), parseFloat(START_LONGTITUDE));
})


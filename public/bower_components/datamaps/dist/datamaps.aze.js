(function() {
  var svg;

  //save off default references
  var d3 = window.d3, topojson = window.topojson;

  var defaultOptions = {
    scope: 'world',
    responsive: false,
    aspectRatio: 0.5625,
    setProjection: setProjection,
    projection: 'equirectangular',
    dataType: 'json',
    data: {},
    done: function() {},
    fills: {
      defaultFill: '#ABDDA4'
    },
    filters: {},
    geographyConfig: {
        dataUrl: null,
        hideAntarctica: true,
        hideHawaiiAndAlaska : false,
        borderWidth: 1,
        borderColor: '#FDFDFD',
        popupTemplate: function(geography, data) {
          return '<div class="hoverinfo"><strong>' + geography.properties.name + '</strong></div>';
        },
        popupOnHover: true,
        highlightOnHover: true,
        highlightFillColor: '#FC8D59',
        highlightBorderColor: 'rgba(250, 15, 160, 0.2)',
        highlightBorderWidth: 2
    },
    projectionConfig: {
      rotation: [97, 0]
    },
    bubblesConfig: {
        borderWidth: 2,
        borderColor: '#FFFFFF',
        popupOnHover: true,
        radius: null,
        popupTemplate: function(geography, data) {
          return '<div class="hoverinfo"><strong>' + data.name + '</strong></div>';
        },
        fillOpacity: 0.75,
        animate: true,
        highlightOnHover: true,
        highlightFillColor: '#FC8D59',
        highlightBorderColor: 'rgba(250, 15, 160, 0.2)',
        highlightBorderWidth: 2,
        highlightFillOpacity: 0.85,
        exitDelay: 100,
        key: JSON.stringify
    },
    arcConfig: {
      strokeColor: '#DD1C77',
      strokeWidth: 1,
      arcSharpness: 1,
      animationSpeed: 600
    }
  };

  /*
    Getter for value. If not declared on datumValue, look up the chain into optionsValue
  */
  function val( datumValue, optionsValue, context ) {
    if ( typeof context === 'undefined' ) {
      context = optionsValue;
      optionsValues = undefined;
    }
    var value = typeof datumValue !== 'undefined' ? datumValue : optionsValue;

    if (typeof value === 'undefined') {
      return  null;
    }

    if ( typeof value === 'function' ) {
      var fnContext = [context];
      if ( context.geography ) {
        fnContext = [context.geography, context.data];
      }
      return value.apply(null, fnContext);
    }
    else {
      return value;
    }
  }

  function addContainer( element, height, width ) {
    this.svg = d3.select( element ).append('svg')
      .attr('width', width || element.offsetWidth)
      .attr('data-width', width || element.offsetWidth)
      .attr('class', 'datamap')
      .attr('height', height || element.offsetHeight)
      .style('overflow', 'hidden'); // IE10+ doesn't respect height/width when map is zoomed in

    if (this.options.responsive) {
      d3.select(this.options.element).style({'position': 'relative', 'padding-bottom': (this.options.aspectRatio*100) + '%'});
      d3.select(this.options.element).select('svg').style({'position': 'absolute', 'width': '100%', 'height': '100%'});
      d3.select(this.options.element).select('svg').select('g').selectAll('path').style('vector-effect', 'non-scaling-stroke');

    }

    return this.svg;
  }

  // setProjection takes the svg element and options
  function setProjection( element, options ) {
    var width = options.width || element.offsetWidth;
    var height = options.height || element.offsetHeight;
    var projection, path;
    var svg = this.svg;

    if ( options && typeof options.scope === 'undefined') {
      options.scope = 'world';
    }

    if ( options.scope === 'usa' ) {
      projection = d3.geo.albersUsa()
        .scale(width)
        .translate([width / 2, height / 2]);
    }
    else if ( options.scope === 'world' ) {
      projection = d3.geo[options.projection]()
        .scale((width + 1) / 2 / Math.PI)
        .translate([width / 2, height / (options.projection === "mercator" ? 1.45 : 1.8)]);
    }

    if ( options.projection === 'orthographic' ) {

      svg.append("defs").append("path")
        .datum({type: "Sphere"})
        .attr("id", "sphere")
        .attr("d", path);

      svg.append("use")
          .attr("class", "stroke")
          .attr("xlink:href", "#sphere");

      svg.append("use")
          .attr("class", "fill")
          .attr("xlink:href", "#sphere");
      projection.scale(250).clipAngle(90).rotate(options.projectionConfig.rotation)
    }

    path = d3.geo.path()
      .projection( projection );

    return {path: path, projection: projection};
  }

  function addStyleBlock() {
    if ( d3.select('.datamaps-style-block').empty() ) {
      d3.select('head').append('style').attr('class', 'datamaps-style-block')
      .html('.datamap path.datamaps-graticule { fill: none; stroke: #777; stroke-width: 0.5px; stroke-opacity: .5; pointer-events: none; } .datamap .labels {pointer-events: none;} .datamap path {stroke: #FFFFFF; stroke-width: 1px;} .datamaps-legend dt, .datamaps-legend dd { float: left; margin: 0 3px 0 0;} .datamaps-legend dd {width: 20px; margin-right: 6px; border-radius: 3px;} .datamaps-legend {padding-bottom: 20px; z-index: 1001; position: absolute; left: 4px; font-size: 12px; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;} .datamaps-hoverover {display: none; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; } .hoverinfo {padding: 4px; border-radius: 1px; background-color: #FFF; box-shadow: 1px 1px 5px #CCC; font-size: 12px; border: 1px solid #CCC; } .hoverinfo hr {border:1px dotted #CCC; }');
    }
  }

  function drawSubunits( data ) {
    var fillData = this.options.fills,
        colorCodeData = this.options.data || {},
        geoConfig = this.options.geographyConfig;


    var subunits = this.svg.select('g.datamaps-subunits');
    if ( subunits.empty() ) {
      subunits = this.addLayer('datamaps-subunits', null, true);
    }

    var geoData = topojson.feature( data, data.objects[ this.options.scope ] ).features;
    if ( geoConfig.hideAntarctica ) {
      geoData = geoData.filter(function(feature) {
        return feature.id !== "ATA";
      });
    }

    if ( geoConfig.hideHawaiiAndAlaska ) {
      geoData = geoData.filter(function(feature) {
        return feature.id !== "HI" && feature.id !== 'AK';
      });
    }

    var geo = subunits.selectAll('path.datamaps-subunit').data( geoData );

    geo.enter()
      .append('path')
      .attr('d', this.path)
      .attr('class', function(d) {
        return 'datamaps-subunit ' + d.id;
      })
      .attr('data-info', function(d) {
        return JSON.stringify( colorCodeData[d.id]);
      })
      .style('fill', function(d) {
        //if fillKey - use that
        //otherwise check 'fill'
        //otherwise check 'defaultFill'
        var fillColor;

        var datum = colorCodeData[d.id];
        if ( datum && datum.fillKey ) {
          fillColor = fillData[ val(datum.fillKey, {data: colorCodeData[d.id], geography: d}) ];
        }

        if ( typeof fillColor === 'undefined' ) {
          fillColor = val(datum && datum.fillColor, fillData.defaultFill, {data: colorCodeData[d.id], geography: d});
        }

        return fillColor;
      })
      .style('stroke-width', geoConfig.borderWidth)
      .style('stroke', geoConfig.borderColor);
  }

  function handleGeographyConfig () {
    var hoverover;
    var svg = this.svg;
    var self = this;
    var options = this.options.geographyConfig;

    if ( options.highlightOnHover || options.popupOnHover ) {
      svg.selectAll('.datamaps-subunit')
        .on('mouseover', function(d) {
          var $this = d3.select(this);
          var datum = self.options.data[d.id] || {};
          if ( options.highlightOnHover ) {
            var previousAttributes = {
              'fill':  $this.style('fill'),
              'stroke': $this.style('stroke'),
              'stroke-width': $this.style('stroke-width'),
              'fill-opacity': $this.style('fill-opacity')
            };

            $this
              .style('fill', val(datum.highlightFillColor, options.highlightFillColor, datum))
              .style('stroke', val(datum.highlightBorderColor, options.highlightBorderColor, datum))
              .style('stroke-width', val(datum.highlightBorderWidth, options.highlightBorderWidth, datum))
              .style('fill-opacity', val(datum.highlightFillOpacity, options.highlightFillOpacity, datum))
              .attr('data-previousAttributes', JSON.stringify(previousAttributes));

            //as per discussion on https://github.com/markmarkoh/datamaps/issues/19
            if ( ! /((MSIE)|(Trident))/.test(navigator.userAgent) ) {
             moveToFront.call(this);
            }
          }

          if ( options.popupOnHover ) {
            self.updatePopup($this, d, options, svg);
          }
        })
        .on('mouseout', function() {
          var $this = d3.select(this);

          if (options.highlightOnHover) {
            //reapply previous attributes
            var previousAttributes = JSON.parse( $this.attr('data-previousAttributes') );
            for ( var attr in previousAttributes ) {
              $this.style(attr, previousAttributes[attr]);
            }
          }
          $this.on('mousemove', null);
          d3.selectAll('.datamaps-hoverover').style('display', 'none');
        });
    }

    function moveToFront() {
      this.parentNode.appendChild(this);
    }
  }

  //plugin to add a simple map legend
  function addLegend(layer, data, options) {
    data = data || {};
    if ( !this.options.fills ) {
      return;
    }

    var html = '<dl>';
    var label = '';
    if ( data.legendTitle ) {
      html = '<h2>' + data.legendTitle + '</h2>' + html;
    }
    for ( var fillKey in this.options.fills ) {

      if ( fillKey === 'defaultFill') {
        if (! data.defaultFillName ) {
          continue;
        }
        label = data.defaultFillName;
      } else {
        if (data.labels && data.labels[fillKey]) {
          label = data.labels[fillKey];
        } else {
          label= fillKey + ': ';
        }
      }
      html += '<dt>' + label + '</dt>';
      html += '<dd style="background-color:' +  this.options.fills[fillKey] + '">&nbsp;</dd>';
    }
    html += '</dl>';

    var hoverover = d3.select( this.options.element ).append('div')
      .attr('class', 'datamaps-legend')
      .html(html);
  }

    function addGraticule ( layer, options ) {
      var graticule = d3.geo.graticule();
      this.svg.insert("path", '.datamaps-subunits')
        .datum(graticule)
        .attr("class", "datamaps-graticule")
        .attr("d", this.path);
  }

  function handleArcs (layer, data, options) {
    var self = this,
        svg = this.svg;

    if ( !data || (data && !data.slice) ) {
      throw "Datamaps Error - arcs must be an array";
    }

    // For some reason arc options were put in an `options` object instead of the parent arc
    // I don't like this, so to match bubbles and other plugins I'm moving it
    // This is to keep backwards compatability
    for ( var i = 0; i < data.length; i++ ) {
      data[i] = defaults(data[i], data[i].options);
      delete data[i].options;
    }

    if ( typeof options === "undefined" ) {
      options = defaultOptions.arcConfig;
    }

    var arcs = layer.selectAll('path.datamaps-arc').data( data, JSON.stringify );

    var path = d3.geo.path()
        .projection(self.projection);

    arcs
      .enter()
        .append('svg:path')
        .attr('class', 'datamaps-arc')
        .style('stroke-linecap', 'round')
        .style('stroke', function(datum) {
          return val(datum.strokeColor, options.strokeColor, datum);
        })
        .style('fill', 'none')
        .style('stroke-width', function(datum) {
            return val(datum.strokeWidth, options.strokeWidth, datum);
        })
        .attr('d', function(datum) {
            var originXY = self.latLngToXY(val(datum.origin.latitude, datum), val(datum.origin.longitude, datum))
            var destXY = self.latLngToXY(val(datum.destination.latitude, datum), val(datum.destination.longitude, datum));
            var midXY = [ (originXY[0] + destXY[0]) / 2, (originXY[1] + destXY[1]) / 2];
            if (options.greatArc) {
                  // TODO: Move this to inside `if` clause when setting attr `d`
              var greatArc = d3.geo.greatArc()
                  .source(function(d) { return [val(d.origin.longitude, d), val(d.origin.latitude, d)]; })
                  .target(function(d) { return [val(d.destination.longitude, d), val(d.destination.latitude, d)]; });

              return path(greatArc(datum))
            }
            var sharpness = val(datum.arcSharpness, options.arcSharpness, datum);
            return "M" + originXY[0] + ',' + originXY[1] + "S" + (midXY[0] + (50 * sharpness)) + "," + (midXY[1] - (75 * sharpness)) + "," + destXY[0] + "," + destXY[1];
        })
        .transition()
          .delay(100)
          .style('fill', function(datum) {
            /*
              Thank you Jake Archibald, this is awesome.
              Source: http://jakearchibald.com/2013/animated-line-drawing-svg/
            */
            var length = this.getTotalLength();
            this.style.transition = this.style.WebkitTransition = 'none';
            this.style.strokeDasharray = length + ' ' + length;
            this.style.strokeDashoffset = length;
            this.getBoundingClientRect();
            this.style.transition = this.style.WebkitTransition = 'stroke-dashoffset ' + val(datum.animationSpeed, options.animationSpeed, datum) + 'ms ease-out';
            this.style.strokeDashoffset = '0';
            return 'none';
          })

    arcs.exit()
      .transition()
      .style('opacity', 0)
      .remove();
  }

  function handleLabels ( layer, options ) {
    var self = this;
    options = options || {};
    var labelStartCoodinates = this.projection([-67.707617, 42.722131]);
    this.svg.selectAll(".datamaps-subunit")
      .attr("data-foo", function(d) {
        var center = self.path.centroid(d);
        var xOffset = 7.5, yOffset = 5;

        if ( ["FL", "KY", "MI"].indexOf(d.id) > -1 ) xOffset = -2.5;
        if ( d.id === "NY" ) xOffset = -1;
        if ( d.id === "MI" ) yOffset = 18;
        if ( d.id === "LA" ) xOffset = 13;

        var x,y;

        x = center[0] - xOffset;
        y = center[1] + yOffset;

        var smallStateIndex = ["VT", "NH", "MA", "RI", "CT", "NJ", "DE", "MD", "DC"].indexOf(d.id);
        if ( smallStateIndex > -1) {
          var yStart = labelStartCoodinates[1];
          x = labelStartCoodinates[0];
          y = yStart + (smallStateIndex * (2+ (options.fontSize || 12)));
          layer.append("line")
            .attr("x1", x - 3)
            .attr("y1", y - 5)
            .attr("x2", center[0])
            .attr("y2", center[1])
            .style("stroke", options.labelColor || "#000")
            .style("stroke-width", options.lineWidth || 1)
        }

        layer.append("text")
          .attr("x", x)
          .attr("y", y)
          .style("font-size", (options.fontSize || 10) + 'px')
          .style("font-family", options.fontFamily || "Verdana")
          .style("fill", options.labelColor || "#000")
          .text( d.id );
        return "bar";
      });
  }


  function handleBubbles (layer, data, options ) {
    var self = this,
        fillData = this.options.fills,
        filterData = this.options.filters,
        svg = this.svg;

    if ( !data || (data && !data.slice) ) {
      throw "Datamaps Error - bubbles must be an array";
    }

    var bubbles = layer.selectAll('circle.datamaps-bubble').data( data, options.key );

    bubbles
      .enter()
        .append('svg:circle')
        .attr('class', 'datamaps-bubble')
        .attr('cx', function ( datum ) {
          var latLng;
          if ( datumHasCoords(datum) ) {
            latLng = self.latLngToXY(datum.latitude, datum.longitude);
          }
          else if ( datum.centered ) {
            latLng = self.path.centroid(svg.select('path.' + datum.centered).data()[0]);
          }
          if ( latLng ) return latLng[0];
        })
        .attr('cy', function ( datum ) {
          var latLng;
          if ( datumHasCoords(datum) ) {
            latLng = self.latLngToXY(datum.latitude, datum.longitude);
          }
          else if ( datum.centered ) {
            latLng = self.path.centroid(svg.select('path.' + datum.centered).data()[0]);
          }
          if ( latLng ) return latLng[1];
        })
        .attr('r', function(datum) {
          // if animation enabled start with radius 0, otherwise use full size.
          return options.animate ? 0 : val(datum.radius, options.radius, datum);
        })
        .attr('data-info', function(d) {
          return JSON.stringify(d);
        })
        .attr('filter', function (datum) {
          var filterKey = filterData[ val(datum.filterKey, options.filterKey, datum) ];

          if (filterKey) {
            return filterKey;
          }
        })
        .style('stroke', function ( datum ) {
          return val(datum.borderColor, options.borderColor, datum);
        })
        .style('stroke-width', function ( datum ) {
          return val(datum.borderWidth, options.borderWidth, datum);
        })
        .style('fill-opacity', function ( datum ) {
          return val(datum.fillOpacity, options.fillOpacity, datum);
        })
        .style('fill', function ( datum ) {
          var fillColor = fillData[ val(datum.fillKey, options.fillKey, datum) ];
          return fillColor || fillData.defaultFill;
        })
        .on('mouseover', function ( datum ) {
          var $this = d3.select(this);

          if (options.highlightOnHover) {
            //save all previous attributes for mouseout
            var previousAttributes = {
              'fill':  $this.style('fill'),
              'stroke': $this.style('stroke'),
              'stroke-width': $this.style('stroke-width'),
              'fill-opacity': $this.style('fill-opacity')
            };

            $this
              .style('fill', val(datum.highlightFillColor, options.highlightFillColor, datum))
              .style('stroke', val(datum.highlightBorderColor, options.highlightBorderColor, datum))
              .style('stroke-width', val(datum.highlightBorderWidth, options.highlightBorderWidth, datum))
              .style('fill-opacity', val(datum.highlightFillOpacity, options.highlightFillOpacity, datum))
              .attr('data-previousAttributes', JSON.stringify(previousAttributes));
          }

          if (options.popupOnHover) {
            self.updatePopup($this, datum, options, svg);
          }
        })
        .on('mouseout', function ( datum ) {
          var $this = d3.select(this);

          if (options.highlightOnHover) {
            //reapply previous attributes
            var previousAttributes = JSON.parse( $this.attr('data-previousAttributes') );
            for ( var attr in previousAttributes ) {
              $this.style(attr, previousAttributes[attr]);
            }
          }

          d3.selectAll('.datamaps-hoverover').style('display', 'none');
        })

    bubbles.transition()
      .duration(400)
      .attr('r', function ( datum ) {
        return val(datum.radius, options.radius, datum);
      });

    bubbles.exit()
      .transition()
        .delay(options.exitDelay)
        .attr("r", 0)
        .remove();

    function datumHasCoords (datum) {
      return typeof datum !== 'undefined' && typeof datum.latitude !== 'undefined' && typeof datum.longitude !== 'undefined';
    }
  }

  //stolen from underscore.js
  function defaults(obj) {
    Array.prototype.slice.call(arguments, 1).forEach(function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] == null) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  }
  /**************************************
             Public Functions
  ***************************************/

  function Datamap( options ) {

    if ( typeof d3 === 'undefined' || typeof topojson === 'undefined' ) {
      throw new Error('Include d3.js (v3.0.3 or greater) and topojson on this page before creating a new map');
   }
    //set options for global use
    this.options = defaults(options, defaultOptions);
    this.options.geographyConfig = defaults(options.geographyConfig, defaultOptions.geographyConfig);
    this.options.projectionConfig = defaults(options.projectionConfig, defaultOptions.projectionConfig);
    this.options.bubblesConfig = defaults(options.bubblesConfig, defaultOptions.bubblesConfig);
    this.options.arcConfig = defaults(options.arcConfig, defaultOptions.arcConfig);

    //add the SVG container
    if ( d3.select( this.options.element ).select('svg').length > 0 ) {
      addContainer.call(this, this.options.element, this.options.height, this.options.width );
    }

    /* Add core plugins to this instance */
    this.addPlugin('bubbles', handleBubbles);
    this.addPlugin('legend', addLegend);
    this.addPlugin('arc', handleArcs);
    this.addPlugin('labels', handleLabels);
    this.addPlugin('graticule', addGraticule);

    //append style block with basic hoverover styles
    if ( ! this.options.disableDefaultStyles ) {
      addStyleBlock();
    }

    return this.draw();
  }

  // resize map
  Datamap.prototype.resize = function () {

    var self = this;
    var options = self.options;

    if (options.responsive) {
      var newsize = options.element.clientWidth,
          oldsize = d3.select( options.element).select('svg').attr('data-width');

      d3.select(options.element).select('svg').selectAll('g').attr('transform', 'scale(' + (newsize / oldsize) + ')');
    }
  }

  // actually draw the features(states & countries)
  Datamap.prototype.draw = function() {
    //save off in a closure
    var self = this;
    var options = self.options;

    //set projections and paths based on scope
    var pathAndProjection = options.setProjection.apply(self, [options.element, options] );

    this.path = pathAndProjection.path;
    this.projection = pathAndProjection.projection;

    //if custom URL for topojson data, retrieve it and render
    if ( options.geographyConfig.dataUrl ) {
      d3.json( options.geographyConfig.dataUrl, function(error, results) {
        if ( error ) throw new Error(error);
        self.customTopo = results;
        draw( results );
      });
    }
    else {
      draw( this[options.scope + 'Topo'] || options.geographyConfig.dataJson);
    }

    return this;

      function draw (data) {
        // if fetching remote data, draw the map first then call `updateChoropleth`
        if ( self.options.dataUrl ) {
          //allow for csv or json data types
          d3[self.options.dataType](self.options.dataUrl, function(data) {
            //in the case of csv, transform data to object
            if ( self.options.dataType === 'csv' && (data && data.slice) ) {
              var tmpData = {};
              for(var i = 0; i < data.length; i++) {
                tmpData[data[i].id] = data[i];
              }
              data = tmpData;
            }
            Datamaps.prototype.updateChoropleth.call(self, data);
          });
        }
        drawSubunits.call(self, data);
        handleGeographyConfig.call(self);

        if ( self.options.geographyConfig.popupOnHover || self.options.bubblesConfig.popupOnHover) {
          hoverover = d3.select( self.options.element ).append('div')
            .attr('class', 'datamaps-hoverover')
            .style('z-index', 10001)
            .style('position', 'absolute');
        }

        //fire off finished callback
        self.options.done(self);
      }
  };
  /**************************************
                TopoJSON
  ***************************************/
  Datamap.prototype.worldTopo = '__WORLD__';
  Datamap.prototype.abwTopo = '__ABW__';
  Datamap.prototype.afgTopo = '__AFG__';
  Datamap.prototype.agoTopo = '__AGO__';
  Datamap.prototype.aiaTopo = '__AIA__';
  Datamap.prototype.albTopo = '__ALB__';
  Datamap.prototype.aldTopo = '__ALD__';
  Datamap.prototype.andTopo = '__AND__';
  Datamap.prototype.areTopo = '__ARE__';
  Datamap.prototype.argTopo = '__ARG__';
  Datamap.prototype.armTopo = '__ARM__';
  Datamap.prototype.asmTopo = '__ASM__';
  Datamap.prototype.ataTopo = '__ATA__';
  Datamap.prototype.atcTopo = '__ATC__';
  Datamap.prototype.atfTopo = '__ATF__';
  Datamap.prototype.atgTopo = '__ATG__';
  Datamap.prototype.ausTopo = '__AUS__';
  Datamap.prototype.autTopo = '__AUT__';
  Datamap.prototype.azeTopo = {"type":"Topology","objects":{"aze":{"type":"GeometryCollection","geometries":[{"type":"Polygon","properties":{"name":"Ağstafa"},"id":"AZ.AF","arcs":[[0,1,2,3]]},{"type":"Polygon","properties":{"name":"Daşkəsən"},"id":"AZ.DS","arcs":[[4,5,6,7,8]]},{"type":"Polygon","properties":{"name":"Gədəbəy"},"id":"AZ.GD","arcs":[[-8,9,10,11],[12]]},{"type":"Polygon","properties":{"name":"Gəncə"},"id":"AZ.GA","arcs":[[13,14]]},{"type":"Polygon","properties":{"name":"Xanlar"},"id":"AZ.XR","arcs":[[-14,15,16,17,-5,18,19]]},{"type":"Polygon","properties":{"name":"Goranboy"},"id":"AZ.GR","arcs":[[20,21,-17,22,23],[24]]},{"type":"Polygon","properties":{"name":"Kəlbəcər"},"id":"AZ.KA","arcs":[[-18,-22,25,26,27,28,29,-6]]},{"type":"Polygon","properties":{"name":"Mingəçevir"},"id":"AZ.MI","arcs":[[30]]},{"type":"MultiPolygon","properties":{"name":"Qazax"},"id":"AZ.QZ","arcs":[[[31]],[[32]],[[33,-3]]]},{"type":"Polygon","properties":{"name":"Şəmkir"},"id":"AZ.SM","arcs":[[-19,-9,-12,34,35]]},{"type":"Polygon","properties":{"name":"Samux"},"id":"AZ.SX","arcs":[[36,-23,-16,-15,-20,-36,37,38]]},{"type":"Polygon","properties":{"name":"Tovuz"},"id":"AZ.TO","arcs":[[-38,-35,-11,39,-1,40]]},{"type":"Polygon","properties":{"name":"Yevlakh Rayon"},"id":"AZ.YV","arcs":[[41,42,43,44,-24,45],[-31],[46]]},{"type":"MultiPolygon","properties":{"name":"Bakı"},"id":"AZ.BA","arcs":[[[47]],[[48]],[[49,50,51,52,53],[54]]]},{"type":"MultiPolygon","properties":{"name":"Abşeron"},"id":"AZ.AR","arcs":[[[-55]],[[-52,55,56,57,58]]]},{"type":"Polygon","properties":{"name":"Ağdam"},"id":"AZ.AM","arcs":[[59,60,61,62,-27,63]]},{"type":"Polygon","properties":{"name":"Ağdaş"},"id":"AZ.AS","arcs":[[64,65,66,67,68,-43,69]]},{"type":"Polygon","properties":{"name":"Ağsu"},"id":"AZ.AU","arcs":[[70,71,72,73]]},{"type":"Polygon","properties":{"name":"Hajigabul"},"id":"AZ.HA","arcs":[[-56,-51,74,75,76,77,-71,78,79]]},{"type":"Polygon","properties":{"name":"Astara"},"id":"AZ.AA","arcs":[[80,81,82]]},{"type":"Polygon","properties":{"name":"Bərdə"},"id":"AZ.BR","arcs":[[83,84,-60,85,-44,-69]]},{"type":"Polygon","properties":{"name":"Beyləqan"},"id":"AZ.BQ","arcs":[[86,87,88,89,90]]},{"type":"Polygon","properties":{"name":"Biləsuvar"},"id":"AZ.BS","arcs":[[91,92,93,94,95,96]]},{"type":"Polygon","properties":{"name":"Cəbrayıl"},"id":"AZ.CB","arcs":[[97,98,99,100,101]]},{"type":"Polygon","properties":{"name":"Cəlilabad"},"id":"AZ.CL","arcs":[[102,103,104,105,-95]]},{"type":"Polygon","properties":{"name":"Dəvəçi"},"id":"AZ.DV","arcs":[[106,107,108,109,110,111]]},{"type":"Polygon","properties":{"name":"Füzuli"},"id":"AZ.FU","arcs":[[112,-98,113,114,-89]]},{"type":"Polygon","properties":{"name":"Göyçay"},"id":"AZ.GY","arcs":[[115,116,-66,117,118]]},{"type":"Polygon","properties":{"name":"İmişli"},"id":"AZ.IM","arcs":[[119,120,-97,121,-87,122,123]]},{"type":"Polygon","properties":{"name":"İsmayıllı"},"id":"AZ.IS","arcs":[[124,-73,125,-119,126,127]]},{"type":"Polygon","properties":{"name":"Kürdəmir"},"id":"AZ.KU","arcs":[[-78,128,-124,129,130,-116,-126,-72]]},{"type":"MultiPolygon","properties":{"name":"Lankaran"},"id":"AZ.LN","arcs":[[[131,132,133,-82,134,135]],[[136,137,138]]]},{"type":"Polygon","properties":{"name":"Masallı"},"id":"AZ.MA","arcs":[[139,-138,140,-136,141,142,-104]]},{"type":"Polygon","properties":{"name":"Lerik"},"id":"AZ.LE","arcs":[[-135,-81,143,144,-142]]},{"type":"Polygon","properties":{"name":"Neftçala"},"id":"AZ.NE","arcs":[[145,-139,-140,-103,146]]},{"type":"Polygon","properties":{"name":"Qobustan"},"id":"AZ.QO","arcs":[[-57,-80,147,148]]},{"type":"Polygon","properties":{"name":"Siyəzən"},"id":"AZ.SY","arcs":[[149,150,-108]]},{"type":"Polygon","properties":{"name":"Saatlı"},"id":"AZ.ST","arcs":[[-92,-121,151]]},{"type":"Polygon","properties":{"name":"Sabirabad"},"id":"AZ.SB","arcs":[[152,153,-93,-152,-120,-129,-77]]},{"type":"Polygon","properties":{"name":"Salyan"},"id":"AZ.SL","arcs":[[-50,154,-147,-94,-154,155,-75]]},{"type":"Polygon","properties":{"name":"Şamaxı"},"id":"AZ.SI","arcs":[[-110,156,-148,-79,-74,-125,157]]},{"type":"Polygon","properties":{"name":"Sumqayıt"},"id":"AZ.SQ","arcs":[[-53,-59,158,159]]},{"type":"Polygon","properties":{"name":"Ucar"},"id":"AZ.UC","arcs":[[-117,-131,160,-67]]},{"type":"Polygon","properties":{"name":"Xizı"},"id":"AZ.XI","arcs":[[161,-159,-58,-149,-157,-109,-151]]},{"type":"Polygon","properties":{"name":"Yardımlı"},"id":"AZ.YR","arcs":[[-143,-145,162,-105]]},{"type":"Polygon","properties":{"name":"Zərdab"},"id":"AZ.ZR","arcs":[[-130,-123,-91,163,-84,-68,-161]]},{"type":"Polygon","properties":{"name":"Ağcabədi"},"id":"AZ.AC","arcs":[[-90,-115,164,-61,-85,-164]]},{"type":"Polygon","properties":{"name":"Balakən"},"id":"AZ.BL","arcs":[[165,166]]},{"type":"Polygon","properties":{"name":"Qəbələ"},"id":"AZ.QA","arcs":[[167,168,-127,-118,-65,169,170,171]]},{"type":"Polygon","properties":{"name":"Oğuz"},"id":"AZ.OG","arcs":[[-171,172,173]]},{"type":"Polygon","properties":{"name":"Qax"},"id":"AZ.QX","arcs":[[174,-46,-37,175,176,177]]},{"type":"Polygon","properties":{"name":"Şəki"},"id":"AZ.SK","arcs":[[-173,-170,-70,-42,-175,178],[179]]},{"type":"Polygon","properties":{"name":"Quba"},"id":"AZ.QB","arcs":[[-111,-158,-128,-169,180,181]]},{"type":"Polygon","properties":{"name":"Qusar"},"id":"AZ.QR","arcs":[[-181,-168,182,183]]},{"type":"Polygon","properties":{"name":"Xaçmaz"},"id":"AZ.XZ","arcs":[[-112,-182,-184,184]]},{"type":"Polygon","properties":{"name":"Zaqatala"},"id":"AZ.ZQ","arcs":[[-177,185,-166,186]]},{"type":"Polygon","properties":{"name":"Xocavənd"},"id":"AZ.XD","arcs":[[-165,-114,-102,187,188,189,190,-62]]},{"type":"Polygon","properties":{"name":"Lankaran"},"id":"AZ.SU","arcs":[[191,-189,192,193,-29,194]]},{"type":"Polygon","properties":{"name":"Qubadli"},"id":"AZ.QD","arcs":[[-101,195,196,-193,-188]]},{"type":"Polygon","properties":{"name":"Şuşa"},"id":"AZ.SU","arcs":[[197,198,-190,-192,199]]},{"type":"Polygon","properties":{"name":"Tərtər"},"id":"AZ.TA","arcs":[[-86,-64,-26,-21,-45]]},{"type":"Polygon","properties":{"name":"Xocalı"},"id":"AZ.XC","arcs":[[-191,-199,200,-200,-195,-28,-63],[201]]},{"type":"Polygon","properties":{"name":"Zəngilan"},"id":"AZ.ZG","arcs":[[202,-196,-100]]},{"type":"Polygon","properties":{"name":"Sədərək"},"id":"AZ.SD","arcs":[[203,204]]},{"type":"Polygon","properties":{"name":"Ordubad"},"id":"AZ.OR","arcs":[[205,206]]},{"type":"Polygon","properties":{"name":"Şərur"},"id":"AZ.SR","arcs":[[207,208,-205,209]]},{"type":"Polygon","properties":{"name":"Babək"},"id":"AZ.BB","arcs":[[210,211,212,213,214,215,216]]},{"type":"Polygon","properties":{"name":"Culfa"},"id":"AZ.CF","arcs":[[-206,217,-214,218,-212,219,220]]},{"type":"Polygon","properties":{"name":"Naxçıvan"},"id":"AZ.NX","arcs":[[-213,-219]]},{"type":"Polygon","properties":{"name":"Şahbuz"},"id":"AZ.SH","arcs":[[-220,-211,221]]},{"type":"Polygon","properties":{"name":"Stepanakert"},"id":"AZ.XC","arcs":[[-202]]},{"type":"Polygon","properties":{"name":"Naftalan"},"id":"AZ.NA","arcs":[[-25]]},{"type":"Polygon","properties":{"name":"Lankaran"},"id":"AZ.LA","arcs":[[-133,222]]},{"type":"Polygon","properties":{"name":"Shirvan"},"id":"AZ.AB","arcs":[[-156,-153,-76]]},{"type":"Polygon","properties":{"name":"Şəki"},"id":"AZ.SA","arcs":[[-180]]},{"type":"Polygon","properties":{"name":"Şuşa"},"id":"AZ.SS","arcs":[[-198,-201]]},{"type":"Polygon","properties":{"name":"Yevlakh"},"id":"AZ.YE","arcs":[[-47]]},{"type":"Polygon","properties":{"name":"Kangarli"},"id":"AZ.KG","arcs":[[-216,223,-208,224]]}]}},"arcs":[[[1702,8117],[-52,-36],[-67,-42],[-46,-51],[-32,-69],[-98,2],[-53,-50],[21,-84],[22,-82],[-20,-100],[-51,-68],[-52,-20],[-51,-18],[-29,-50],[-33,-58],[-19,-85]],[[1142,7306],[-24,8],[-21,29],[15,92],[-11,68],[-47,-6],[-16,-11]],[[1038,7486],[0,1],[-4,22],[-4,98],[-12,98],[-5,39],[0,41],[10,18],[10,21],[-5,22],[-6,24],[45,181],[-8,70],[-4,35],[-6,2],[-192,29],[-41,24],[-69,60],[-74,22],[-34,25],[-79,98],[-7,19],[-1,19]],[[552,8454],[260,270],[55,24],[56,-3],[31,-21],[83,-54],[26,-7],[35,4],[56,22],[26,-6],[24,-35],[56,-66],[246,-121],[111,-29],[40,-20],[2,-18],[-24,-16],[-40,-18],[-38,-60],[41,-81],[71,-77],[33,-25]],[[2229,6445],[63,-52],[61,-59],[48,-37],[39,-42],[-56,-110],[-62,-117],[44,-88],[58,-64],[57,-54],[-1,-86],[-78,-111],[-42,-151]],[[2360,5474],[-119,-15],[-119,12],[-107,25],[-96,-48],[-15,-103],[0,-1]],[[1904,5344],[-12,-5],[-34,3],[-73,102]],[[1785,5444],[15,51],[1,43],[16,32],[13,59],[1,70],[18,57],[-15,56],[-22,48],[-20,50],[29,182],[122,96]],[[1943,6188],[69,117],[68,125],[67,71],[82,-56]],[[1785,5444],[-1,2],[-398,289],[-102,121],[-55,150],[-14,33],[-36,30],[-15,23],[-8,30],[-4,64],[-7,28],[-30,47],[-34,35],[-33,41],[-24,67],[0,53],[0,68],[43,96],[67,70],[69,43]],[[1203,6734],[11,-32],[9,-94],[50,-41],[64,-2],[53,-29],[35,-61],[-5,-78],[40,-33],[40,-42],[43,-26],[42,56],[13,87],[8,134],[-1,125],[-7,125],[22,125]],[[1620,6948],[32,-53],[31,-48],[21,-47],[11,-58],[54,-114],[73,-76],[64,-79],[39,-88],[-7,-64],[5,-67],[-11,-34],[11,-32]],[[1274,6483],[-25,-1],[-23,-9],[-22,-19],[-10,-29],[-3,-30],[3,-29],[10,-28],[59,-22],[57,56],[23,74],[-44,32],[-25,5]],[[2798,6554],[-49,-103],[-64,-76],[-65,11],[-16,88],[13,46],[13,44],[19,34],[17,35],[10,33]],[[2676,6666],[87,-2],[35,-110]],[[2798,6554],[100,-10]],[[2898,6544],[47,-138],[-3,-169],[25,-39],[-10,-50],[-38,-58],[-39,-56],[-62,-74],[-56,-85],[-33,-69],[-39,-61],[-51,-163],[-2,-198]],[[2637,5384],[-143,28],[-134,62]],[[2229,6445],[63,56],[69,21],[56,-1],[46,43],[9,50],[5,50],[14,42],[14,41],[4,56],[7,55],[24,59],[28,59]],[[2568,6976],[51,-142],[57,-168]],[[3673,5967],[-41,-50],[-38,-48],[-34,-27],[-33,-32],[-35,-34],[-16,-12],[-20,-15],[-64,-3],[-13,1],[-51,2],[-85,-48],[-82,-65],[-64,-32],[-20,-10],[-11,-5],[-23,-40],[-25,-41],[-11,-18]],[[3007,5490],[-179,-143],[-124,24],[-67,13]],[[2898,6544],[31,132],[68,81],[31,40],[-9,59],[15,41],[34,25],[88,104],[86,110],[74,111],[76,109]],[[3392,7356],[-15,-114],[5,-112],[6,-121],[-14,-116],[-30,-110],[39,-84],[69,-13],[57,-50],[-43,-88],[-52,-92],[31,-63],[68,54],[59,-7],[43,-62],[-2,-122],[9,-125],[49,-20],[53,10],[14,-27],[-7,-43],[-18,-61],[-40,-23]],[[3498,6012],[15,0],[16,15],[2,15],[-1,13],[-9,12],[-13,15],[-10,-12],[-10,-15],[-7,-12],[6,-18],[11,-13]],[[3007,5490],[-6,-51],[-12,-47],[-17,-17],[-17,-20],[-7,-104],[18,-102],[15,-94],[23,-79],[39,17],[37,38],[103,-13],[86,-105],[43,-44],[22,-58],[12,-36],[9,-28],[41,-58]],[[3396,4689],[-59,-6],[-14,-10],[-36,-26]],[[3287,4647],[-71,-16],[-62,-43],[-38,-71],[-53,-40],[-46,43],[-52,33],[-48,-37],[-40,-31],[-12,-10]],[[2865,4475],[-72,-40],[-72,-35],[-77,-15],[-73,-41],[-120,-53],[-124,-23],[-60,-23],[-58,-9],[-43,61],[-44,46],[-34,-69],[-32,-95],[-63,-72],[-66,-62],[-32,-33]],[[1895,4012],[-37,24],[-77,99],[-13,35],[-76,202],[-37,53],[-47,30],[-178,23],[-55,32],[-3,39],[-2,28],[108,91],[281,-60],[119,15],[23,25],[12,30],[20,131],[7,22],[37,43],[33,56],[21,70],[31,184],[1,17],[-1,17],[-3,16],[-44,74],[-25,31],[-25,17],[-37,-3],[-24,-9]],[[3785,6795],[34,17],[33,-2],[18,-31],[16,-39],[-138,-72],[-81,122],[54,36],[64,-31]],[[762,7394],[-18,-32],[-40,8],[-16,66],[5,7],[6,5],[7,1],[7,-2],[49,-53]],[[437,7586],[-25,-66],[-62,27],[-21,35],[-11,43],[6,39],[26,24],[68,-20],[19,-82]],[[1038,7486],[-80,-50],[-39,8],[-74,39],[-81,12],[-28,30],[-27,36],[-35,27],[-55,74],[-29,19],[-5,-52],[-10,-34],[-33,4],[-37,32],[-22,48],[18,92],[169,-9],[59,54],[-2,45],[-23,41],[-89,89],[-29,12],[-112,0],[-29,16],[-10,35],[18,60],[-64,170],[163,170]],[[1620,6948],[-1,89],[30,69],[51,42],[48,53],[57,50],[55,53],[32,86],[26,80],[82,20],[84,-13],[87,-14],[84,25],[12,40],[16,43],[19,32],[18,32],[70,95],[54,114]],[[2444,7844],[72,-122],[70,-123],[39,-96],[-9,-101],[-26,-56],[-13,-67],[-8,-52],[-14,-49],[-17,-102],[30,-100]],[[3146,7764],[50,-48],[78,-4],[68,-51],[7,-80],[11,-84],[24,-65],[8,-76]],[[2444,7844],[-96,60],[-95,67],[-9,8]],[[2244,7979],[43,35],[39,11],[128,1],[31,-14],[27,-33],[49,-79],[101,-115],[36,-27],[101,-42],[28,-31],[48,-82],[31,-23],[37,2],[15,30],[10,44],[19,46],[36,29],[33,-4],[33,-11],[34,6],[23,42]],[[1203,6734],[132,81],[45,65],[32,118],[-3,63],[-30,20],[-40,4],[-35,14],[-27,35],[-73,119],[-45,47],[-17,6]],[[1702,8117],[86,-67],[253,-115],[83,-13],[41,4],[34,16],[45,37]],[[3683,7199],[156,-100],[153,-109],[130,-68],[130,-72]],[[4252,6850],[-24,-116],[-24,-116],[-22,-96],[-1,-103],[22,-86],[-18,-89],[-27,-41]],[[4158,6203],[-12,-17],[-47,-36],[-60,-166],[-100,-21],[-105,-20],[-83,-160]],[[3751,5783],[-31,44],[-25,48],[-9,48],[-13,44]],[[3392,7356],[147,-57],[144,-100]],[[4100,6224],[16,29],[-4,18],[-1,35],[4,20],[8,23],[8,28],[4,36],[-8,9],[-20,3],[-37,-2],[-78,-1],[-30,-60],[25,-93],[54,-41],[59,-4]],[[9967,5561],[24,-34],[8,-45],[-12,-30],[-32,11],[-21,-9],[-26,27],[-16,43],[4,37],[22,-23],[16,7],[15,15],[18,1]],[[9488,5972],[20,-14],[26,11],[12,-18],[4,-60],[16,-31],[22,-24],[17,-39],[2,-34],[-14,-20],[-25,-7],[-34,2],[9,70],[-56,96],[1,68]],[[7834,3642],[-17,86],[-7,96],[-4,124],[25,110]],[[7831,4058],[-2,74],[-8,72],[-23,45],[-25,43],[-23,91],[-30,78]],[[7720,4461],[21,78],[12,77],[30,54],[26,55],[-5,58],[-8,60],[21,63],[30,54],[11,54],[-2,48],[13,48],[29,36],[50,125],[7,160],[-16,157],[-2,145],[54,70],[73,14],[41,55],[45,64],[139,5],[51,12],[52,3],[39,-15],[38,-16],[41,17],[41,25],[78,22],[77,27],[33,46],[-60,30],[-72,31],[-72,28],[-32,-13],[-30,-18],[-40,10],[-32,47]],[[8401,6177],[14,32],[14,33],[5,28]],[[8434,6270],[24,-15],[85,-15],[74,-29],[40,-4],[31,8],[95,50],[41,9],[195,-9],[14,-18],[7,-20],[6,-21],[8,-19],[30,-48],[33,-37],[34,-25],[155,-42],[30,-22],[18,-43],[21,-66],[26,-61],[34,-27],[37,-17],[32,-44],[25,-57],[17,-59],[17,-236],[12,-24],[14,-53],[9,-59],[-5,-40],[-33,82],[-36,70],[-42,64],[-85,88],[-36,25],[-38,19],[-77,13],[-64,27],[-34,6],[-19,-3],[-24,-13],[-15,-5],[-66,0],[-30,-17],[-58,-61],[-34,0],[-12,14],[-22,45],[-14,19],[-18,9],[-44,10],[-44,31],[-34,-24],[-57,-65],[12,-68],[-49,-63],[-69,-47],[-114,-32],[-99,-75],[-131,-62],[-30,-28],[-66,-93],[-30,-27],[-19,-31],[-3,-62],[9,-77],[1,-31],[-92,-46],[-17,-44],[4,-58],[24,-58],[15,-21],[24,-25],[14,-21],[7,-29],[-10,-19],[-17,-14],[-30,-36],[-13,-8],[-13,-12],[-12,-29],[-8,-35],[-1,-25],[9,-58],[19,-61],[6,-33],[-8,-33],[-15,-22],[-13,-14],[-9,-16],[-4,-27],[3,-16],[6,-15],[5,-17],[-2,-21],[-7,-12],[-28,-27],[-11,-40],[1,-18],[10,-20],[-8,-37],[10,-39],[39,-70],[-2,-24],[-24,-24],[-44,-32],[-43,-67]],[[8284,5659],[38,-12],[41,6],[38,23],[20,28],[-19,42],[-36,71],[-71,-5],[-54,-42],[4,-9],[26,-49],[13,-53]],[[7720,4461],[-32,57],[-34,52],[-14,48],[-4,56],[-37,81],[-34,85],[-14,96],[-41,72],[-79,16],[-81,-1],[-62,7],[-60,22],[-49,84],[-49,93],[-49,71],[-53,64],[-47,64],[-16,106]],[[6965,5534],[59,-30],[55,-49],[33,-27],[30,44],[38,49],[37,49],[48,64],[59,25],[34,45],[26,63],[49,36],[54,13],[52,30],[48,50],[48,61],[35,83]],[[7670,6040],[126,6],[110,63],[8,54],[8,54],[19,36],[23,35],[47,53],[35,74]],[[8046,6415],[66,-56],[58,-87],[28,-63],[29,-59],[87,-12],[87,39]],[[3951,5072],[121,13],[122,-5]],[[4194,5080],[-70,-91],[-80,-66],[-7,-66],[51,-56],[-48,-55],[-10,-4],[-53,-22],[-3,-78],[-4,-80],[-21,-22],[-22,-17],[37,-141],[140,-38],[1,-1],[72,36],[75,14],[39,-83],[-36,-100],[-13,-13],[-13,-11]],[[4229,4186],[-26,9],[-30,9],[-43,-6],[-11,-1],[-6,-12],[-11,-18],[-9,-17],[-23,-45],[-97,30],[-93,81],[-71,44],[-74,-22],[-18,-83],[-34,-69],[-67,-33],[-65,-43]],[[3551,4010],[31,80],[3,9],[33,73],[5,11],[35,60],[15,77],[-71,42],[-27,33],[-32,40],[-11,31],[-32,96],[-83,54],[-70,-26],[-60,57]],[[3396,4689],[7,103],[25,77],[44,59],[13,98],[17,9],[11,7],[65,38],[107,67],[-10,45],[0,1],[12,36],[2,-1],[20,-9],[18,-23],[43,-10],[40,21],[32,-52],[16,-73],[44,-18],[18,3],[31,5]],[[4701,6772],[6,-125],[5,-125],[41,-58],[56,-41]],[[4809,6423],[28,-43],[23,-42],[-7,-32],[-20,-28],[-22,-86],[-6,-95]],[[4805,6097],[-66,27],[-65,-10],[-50,-42],[-14,-103],[-12,-85],[25,-72],[48,-35],[26,-65]],[[4697,5712],[-24,-77],[-25,-73],[-55,-78],[-33,-36]],[[4560,5448],[-11,24],[-18,25],[-9,-5],[1,31],[4,28],[7,25],[11,24],[-20,35],[-64,-13],[-33,17],[35,64],[-14,31],[-92,43],[14,22],[35,34],[10,22],[4,45],[-13,7],[-20,-10],[-20,-5],[-27,0],[-6,7],[1,28],[-6,6],[-6,9],[-9,21],[-14,20],[-19,9],[-13,23],[11,51],[4,53],[-30,29],[-13,-8],[-16,-21],[-25,-40],[-16,-13],[-6,26],[2,37],[15,32],[-20,27],[-14,14],[-2,1]],[[4252,6850],[71,-19],[70,-22],[43,-24],[42,0],[13,10],[17,11],[31,-12],[30,-19],[65,-20],[67,17]],[[6321,5542],[-35,-64],[-22,-87]],[[6264,5391],[-59,62],[-37,97],[-48,31],[-51,23],[-2,107],[-5,113],[-67,42],[-76,-8],[-50,-54],[-48,-50],[-37,46],[-29,35],[-60,-14],[-47,55],[15,123],[34,118]],[[5697,6117],[32,-28],[32,31],[6,40],[7,44],[30,45],[34,35],[43,32],[40,36],[9,28],[15,25],[28,18],[29,17],[111,68],[102,97],[52,119],[33,140]],[[6300,6864],[15,-39],[12,-38],[53,-68],[32,-90],[-17,-53],[-22,-54],[1,-20],[0,-29],[-11,-24],[-14,-24],[-74,-90],[-19,-119],[48,-79],[65,-34],[60,-3],[59,-2],[37,-25],[35,-34],[37,-23],[29,-29],[-26,-42],[-35,-23],[-87,-48],[-75,-77],[-6,-69],[-5,-69],[-33,-60],[-38,-57]],[[7831,4058],[-52,52],[-50,54],[-25,46],[-31,32],[-42,-13],[-44,-16],[-28,9],[-30,7],[-86,10],[-88,18],[-67,47],[-66,58],[-61,-4],[-57,-9]],[[7104,4349],[26,35],[22,35],[1,53],[2,31],[-8,25],[-16,13],[-19,-4],[-45,2],[-38,14],[-25,-11]],[[7004,4542],[-58,61],[-34,14],[-97,21],[-21,12],[-13,40],[-32,14],[-38,9],[-44,31],[-8,-3],[-4,3],[-2,24],[1,30],[-1,13],[-5,6],[-6,52],[3,37],[-38,26],[-153,54],[-160,3]],[[6294,4989],[14,118],[-4,114],[-9,98],[-31,72]],[[6321,5542],[69,-21],[68,-25],[70,-53],[73,-45],[59,-37],[56,36],[50,72],[22,111]],[[6788,5580],[84,-58],[93,12]],[[6427,219],[20,72],[25,60],[12,66],[31,40],[37,26],[40,16],[38,-8],[38,20],[37,29]],[[6705,540],[154,11],[137,49]],[[6996,600],[10,-481],[0,-1],[-110,31],[-55,0],[-38,-27],[-34,-45],[-43,-36],[-47,-26],[-41,-15],[-79,9],[-8,1],[-55,69],[-47,103],[-22,37]],[[4560,5448],[3,-8],[0,-16],[135,-21],[-13,-24],[-32,-17],[-14,-18],[-9,-23],[1,-1]],[[4631,5320],[-145,-140],[-144,-122],[-57,-25],[-50,46],[-44,46],[3,-45]],[[3951,5072],[-8,54],[-11,53],[-4,98],[4,98],[4,82],[-50,24],[-41,47],[-29,70],[-24,22],[-19,30],[-11,66],[-11,67]],[[5155,4921],[-73,-86],[62,-83],[56,-84],[-3,-111],[-67,-63],[-35,-25],[-24,-43],[20,-44],[32,-28],[-30,-102],[-10,-83],[64,-43],[56,-66],[61,-65],[59,-58],[-11,-87],[-73,-55],[-73,-84],[-16,-93],[0,-2]],[[5150,3616],[-73,-97],[-206,-149]],[[4871,3370],[0,1],[0,115],[-108,118],[-38,77],[-41,62],[-57,19],[-28,85]],[[4599,3847],[-33,68],[-24,56],[23,25],[22,20],[-9,37],[-13,46],[30,63],[52,28],[11,29],[20,18],[41,-4],[41,4],[55,30],[57,21],[50,67],[26,102],[19,134],[17,138],[39,109],[73,213]],[[5096,5051],[24,-3],[22,-14],[1,-35],[9,-72],[3,-6]],[[6160,3513],[94,116],[97,-77],[85,-58],[71,105]],[[6507,3599],[74,-16],[74,-41],[83,-39],[85,-35]],[[6823,3468],[-37,-148],[-9,-148],[34,-54],[31,-61],[-8,-75],[-17,-77]],[[6817,2905],[-43,-1],[-42,13],[-27,19],[-28,0],[-20,-34],[-14,-40],[-27,-31],[-5,-41],[-4,-125],[-52,-64],[-56,44],[-19,103],[-39,81],[-60,0],[-52,-80],[-59,-65],[-36,-6],[-32,-22],[-20,-33],[-24,-27],[-62,44],[-5,136],[-18,36]],[[6073,2812],[18,7],[-38,104],[-48,85],[-117,140],[-287,447],[-105,126],[-33,29],[-23,8]],[[5440,3758],[1,26],[104,-11],[121,-116],[111,-143],[201,-158],[182,157]],[[3894,3068],[62,-39],[59,-46],[33,-78],[34,-68],[47,9],[49,14],[52,-43],[19,-33],[1,0]],[[4250,2784],[-20,-15],[-171,-86],[-81,-65],[-17,-25],[-6,-28],[-62,-129],[-28,-108],[-9,-21],[-18,-28],[-12,-8],[-102,-76],[-21,-5],[-25,9],[-48,28],[-27,-1],[-28,-17]],[[3575,2209],[-1,1],[-15,79],[-59,99]],[[3500,2388],[-56,53],[-58,45],[-27,81],[-6,94],[-32,64],[-25,62],[11,89],[41,50]],[[3348,2926],[51,-26],[6,-3],[10,-5],[63,-8],[12,49],[8,35],[3,10],[-14,48],[-12,43],[37,32],[3,-3],[39,-34],[27,-13],[27,-13],[11,-33],[-2,-39],[50,-56],[57,-41],[22,-52],[43,9],[29,35],[34,6],[26,2],[2,37],[-7,28],[-15,61],[10,20],[26,53]],[[6817,2905],[-44,-73],[-38,-81],[-13,-109],[13,-109],[61,-181],[-19,-195]],[[6777,2157],[-34,20],[-36,-2],[-2,-46],[-16,-21],[-32,14],[-33,-11],[-1,-66],[27,-65],[-40,-38],[-48,-24],[-49,-43],[-38,-64],[-61,-86],[-86,-30]],[[6328,1695],[-47,77],[-59,50],[-40,-11],[-41,-17],[-114,-6]],[[6027,1788],[8,38],[1,40],[-9,36],[-51,144],[-26,33],[-98,52],[-97,123],[-42,77],[-23,77],[3,98],[32,81],[49,61],[58,39],[107,28],[90,79],[44,18]],[[7355,8475],[52,-136],[25,-46],[21,-53],[10,-63],[21,-248],[11,-52],[19,-22],[1,-3]],[[7515,7852],[-24,-3],[-68,69],[-65,68],[-54,-21],[-54,-29],[-123,0],[-57,-99],[31,-98],[2,-108],[-18,-48],[-24,-40],[-35,-7],[-33,-8],[-49,-44],[-25,-76],[14,-130],[22,-132]],[[6955,7146],[-56,-45],[-51,-62]],[[6848,7039],[-86,61],[-88,54]],[[6674,7154],[6,127],[-9,107],[-25,70],[32,63],[44,42],[23,73],[-62,103],[-73,92],[46,138],[89,99],[22,35],[22,36],[-1,42],[-23,35],[-1,116],[20,118]],[[6784,8450],[55,8],[55,30],[53,-24],[60,-5],[77,38],[81,-10],[89,-20],[91,4],[10,4]],[[4871,3370],[-31,-23],[-90,-119],[-22,-19],[-39,-6],[-119,-53],[-72,-51],[-55,-60],[-85,-142],[-1,-1],[-56,-75],[-51,-37]],[[3894,3068],[9,25],[4,12],[0,32],[14,3],[19,5],[29,11],[-7,55],[-2,11],[-9,46],[15,34],[17,30],[-14,64],[-50,-27],[-34,-38],[-39,-6],[-10,48],[23,35],[5,7],[70,21],[21,34],[17,29],[-55,-9],[-64,17],[30,65],[12,1],[66,7],[40,20],[38,28],[29,42],[33,23],[51,12],[52,17],[36,9],[31,8],[64,21]],[[4335,3760],[132,46],[132,41]],[[5558,6061],[14,-152],[-73,-52]],[[5499,5857],[-44,23],[-45,-6],[-66,11],[-63,38],[-58,38],[-58,38],[-34,4],[-29,-31],[-34,-22],[-41,22],[-42,44],[-44,32],[-37,-16],[-34,-15],[-36,36],[-29,44]],[[4809,6423],[63,45],[66,20],[61,2],[56,34]],[[5055,6524],[59,-20],[58,-26],[44,-19],[42,5],[86,-12],[87,-36],[91,-31],[72,-78],[-42,-131],[6,-115]],[[6054,4709],[13,-27],[-4,-34],[-21,-20],[-33,-12],[-37,-36],[-33,-43]],[[5939,4537],[-24,-47],[-17,-50],[17,-33],[21,-32],[8,-65],[-23,-62],[-28,-68],[-14,-75],[16,-67],[29,-56],[103,-46],[81,-94],[-4,-38],[-9,-34],[-2,-64],[1,-65],[26,-67],[40,-61]],[[5440,3758],[-1,0],[-20,-38],[-18,-21],[-21,-7],[-130,3],[-40,-14],[-33,-30],[-27,-35]],[[5155,4921],[17,-50],[35,14],[17,11],[18,-4],[16,-9]],[[5258,4883],[2,-1],[18,-6],[13,-9],[28,-41],[11,-9],[11,6],[15,24],[10,8],[10,-2],[17,-13],[8,-3],[28,-19],[21,-5],[9,14],[-2,62],[1,32],[6,24],[19,13],[20,-13],[21,-21],[17,-9],[34,28],[35,38],[26,3],[11,-80],[13,-33],[92,-73],[16,-9],[13,-1],[8,-12],[-2,-39],[55,36],[31,9],[30,-6],[13,-9],[16,-17],[13,-20],[11,-47],[14,7],[21,30],[6,3],[9,7],[11,7],[15,0],[14,-11],[8,-17]],[[6177,7306],[75,-111],[91,-80],[11,-127],[-54,-124]],[[5697,6117],[-69,-34],[-70,-22]],[[5055,6524],[46,73],[43,76],[35,84],[50,54],[78,44],[66,67],[2,66],[5,63],[23,11],[25,6],[50,53],[5,89],[-41,90],[-18,93],[10,35],[14,30],[25,-3],[23,-7],[14,45],[9,53],[19,49],[27,39]],[[5565,7634],[51,-14],[51,-6],[48,-26],[48,-34],[91,-68],[93,-55],[130,-11],[100,-114]],[[6294,4989],[-56,-40],[-46,-58],[-54,-41],[-44,-56],[-14,-38],[-26,-47]],[[5258,4883],[42,40],[50,30],[39,55],[28,65],[-20,205],[3,212]],[[5400,5490],[43,60],[32,76],[16,113],[8,118]],[[7044,1424],[-49,-77],[-62,21],[2,-102],[3,-46],[8,-45],[14,-45]],[[6960,1130],[-36,-28],[0,-43],[0,-46],[5,-38],[8,-20],[23,14],[27,47]],[[6987,1016],[9,-416]],[[6705,540],[34,69],[21,69],[-30,46],[-34,32],[-4,49],[5,53],[-22,62],[-26,60],[-75,66],[-75,65],[-21,125],[48,121]],[[6526,1357],[56,-64],[60,-47],[65,17],[62,52],[54,35],[51,40],[22,33],[26,22],[67,-2],[55,-19]],[[7621,2183],[-8,-50],[-24,-93],[-8,-44],[-5,-101],[-8,-61],[-16,-51],[-128,-117],[-68,-35],[-47,51],[5,33],[0,24],[2,19],[16,21],[77,20],[26,18],[23,43],[14,58],[1,57],[-19,54],[-34,23],[-82,3],[0,25],[-10,117],[-6,33],[-31,33],[-32,11],[-73,-3],[-21,-9],[-10,-23],[-6,-29],[-14,-41],[-2,-15],[1,-31],[-4,-22],[-8,-6],[-8,0],[-5,-3],[-3,-134],[6,-70],[28,-61],[-7,-70],[-46,-205],[-6,-19]],[[7081,1533],[-11,61],[-26,93],[-6,76],[1,66],[-39,51],[-40,46],[-2,94],[14,93]],[[6972,2113],[60,101],[67,95],[77,113],[85,86],[50,-56],[34,-92],[53,-47],[60,-23],[66,-43],[70,-23],[27,-41]],[[6777,2157],[91,-54],[104,10]],[[7081,1533],[-33,-103],[-4,-6]],[[6526,1357],[-22,118],[-56,89]],[[6448,1564],[-88,17],[-32,114]],[[6427,219],[-42,70],[-26,47],[-28,42],[-28,57],[-28,33],[-22,39],[-12,76],[-19,62],[-41,0],[-86,-53],[-53,1],[-31,39],[-27,52],[-82,87],[-4,48],[7,56],[-8,41]],[[5897,916],[40,26],[23,47],[23,37],[8,62],[16,55],[29,52],[32,43],[39,31],[34,38],[157,121],[150,136]],[[7708,3189],[1,-37],[17,-53],[159,-188],[21,-33],[14,-37],[-2,-13],[-8,-10],[-10,-95],[2,-29],[14,-32],[-21,14],[-15,18],[-12,21],[-10,25],[-10,0],[6,-43],[15,-47],[21,-40],[26,-25],[0,-21],[-38,12],[-24,35],[-22,40],[-88,76],[-56,-29],[-45,-74],[-17,-90],[1,-313],[-6,-38]],[[6817,2905],[78,-76],[77,-79],[64,-16],[60,60],[32,10],[18,36],[-9,66],[-6,71],[41,97],[8,7],[17,17],[6,17],[48,59],[11,45],[7,31],[42,53],[57,-77],[59,-93],[38,-25],[40,-9],[32,8],[30,27],[66,28],[65,25],[10,2]],[[6788,5580],[-68,-9],[-67,-4],[-11,44],[49,34],[30,34],[10,58],[20,50],[20,51],[10,47],[-21,41],[-7,41],[2,50],[-6,61],[-12,60],[-1,53],[-7,48],[-26,27],[-16,36],[26,55],[30,54],[-6,125],[21,120],[64,64],[71,52]],[[6893,6772],[99,-37],[91,-88],[41,-48],[36,-61],[67,-92],[75,-71],[92,-41],[73,-97],[92,-121],[111,-76]],[[7515,7852],[11,-30],[29,-205],[81,-171],[205,-295],[15,-27]],[[7856,7124],[-8,-4],[-68,2],[-66,-15],[-80,-27],[-84,9],[-72,33],[-68,55],[-49,24],[-42,37],[-12,106],[-38,41],[-37,-16],[-27,-38],[-8,-46],[-11,-42],[-56,-42],[-62,-24],[-55,-27],[-58,-4]],[[5939,4537],[28,-59],[36,6],[46,30],[45,33],[58,35],[59,13],[41,-25],[36,-40],[-12,-39],[-12,-44],[17,-42],[26,-26],[22,-2],[17,24],[37,29],[43,-4],[74,-52],[70,-61],[72,-42],[55,-91],[-1,-56],[-10,-52],[6,-73],[22,-64],[0,-99],[-42,-83],[-78,-50],[-83,-22],[-50,-54],[46,-28]],[[7004,4542],[-5,-84],[0,-40],[12,-38],[12,-20],[21,-13],[11,-7],[11,-15]],[[7066,4325],[0,-10],[28,-65],[19,-35],[8,-26],[1,-18],[-2,-55],[1,-23],[6,-23],[14,-31],[3,-26],[-5,-18],[-11,-22],[-6,-24],[5,-23],[54,-65],[26,-41],[2,-31],[-18,-41],[-24,-79],[-23,-28],[-31,-15],[-36,-49],[-52,-35],[7,-65],[-8,-48],[-38,22],[-41,32],[-62,-9],[-60,-6]],[[7834,3642],[-37,-58],[-33,-71],[2,-50],[-20,-47],[-17,-63],[-14,-66],[-7,-58],[0,-40]],[[7066,4325],[13,-6],[25,30]],[[6848,7039],[-22,-144],[67,-123]],[[6177,7306],[138,-1],[134,-49],[111,-60],[114,-42]],[[8046,6415],[15,57],[58,10],[11,8]],[[8130,6490],[12,-26],[30,-36],[33,-32],[23,-14],[75,-6],[33,-11],[27,-20],[61,-69],[10,-6]],[[5400,5490],[-97,-8],[-95,-20],[-90,15],[-86,-4],[-41,-35],[-43,-8],[-28,47],[-27,55],[-97,95],[-99,85]],[[7856,7124],[2,-6],[16,-46],[36,-39],[78,-62],[38,13],[32,-36],[31,-48],[34,-24],[19,-28],[-8,-63],[-30,-106],[-10,-56],[-2,-30],[2,-32],[7,-18],[23,-36],[5,-15],[1,-2]],[[5897,916],[-4,24],[-22,24],[-226,146],[-111,116],[-34,82],[-4,117],[16,33],[90,72],[4,19],[0,21],[6,19],[315,73],[71,56],[0,1],[16,30],[13,37],[0,2]],[[5096,5051],[-7,1],[-28,10],[-13,37],[-7,77],[-20,-2],[-53,-85],[-21,17],[-15,-7],[-15,-12],[-20,2],[-11,12],[-10,34],[-14,16],[-41,6],[-34,-25],[-28,-32],[-27,-11],[-4,15],[-41,86],[-35,96],[-10,17],[-9,8],[-2,9]],[[4335,3760],[48,121],[-26,110],[-22,18],[-63,51],[-29,83],[-14,43]],[[3307,9841],[11,-65],[-24,-99],[-57,-78],[-67,-58],[-53,-43],[-50,-49],[-28,-81],[-20,-87],[-40,-65],[-50,-44],[-60,-25],[-59,-17],[-46,-41],[-46,-44],[-53,-6],[-51,36],[-42,11]],[[2572,9086],[-2,21],[-38,91],[-4,16],[-24,-1],[-11,-22],[-8,-26],[-15,-15],[-46,48],[-22,128],[-1,145],[16,98],[33,44],[37,5],[80,-22],[36,4],[27,17],[25,27],[74,113],[36,74],[65,168],[37,-12],[46,2],[79,-13],[31,-23],[10,-54],[-9,-116],[10,-49],[30,-32],[33,1],[29,24],[56,61],[35,15],[69,18],[21,20]],[[5193,8018],[13,-36],[55,-46],[62,-18],[63,-14]],[[5386,7904],[44,-170],[135,-100]],[[4701,6772],[60,22],[16,75]],[[4777,6869],[2,175],[35,166],[28,63],[29,63],[6,69],[-7,68],[53,122],[49,135],[13,73],[15,67],[-6,33],[-8,34],[2,74],[3,35]],[[4991,8046],[50,-33],[33,-9],[119,14]],[[4777,6869],[-165,111],[-152,148],[-29,42],[-22,51],[-9,61],[-11,52],[-24,2],[-25,-11],[-15,27],[6,39],[-38,54],[-28,67],[21,115],[37,107],[36,99],[36,99],[21,154],[15,116]],[[4431,8202],[14,-7],[177,-21],[37,-16],[48,-85],[31,-32],[35,0],[61,51],[33,16],[34,-5],[90,-57]],[[4109,8859],[-4,-13],[-18,-115],[-40,-91],[-141,-121],[-153,-86],[-69,-38],[-66,-54],[-29,-44],[-16,-51],[-22,-41],[-31,-32],[-36,-107],[-11,-136],[10,-112],[77,-51],[118,-243],[5,-325]],[[3146,7764],[10,17],[14,92],[9,98],[16,77],[11,18],[22,27],[10,18],[4,18],[2,51],[3,22],[15,22],[14,-3],[5,4],[-10,41],[-54,104],[-33,47],[-11,24],[-3,2]],[[3170,8443],[14,80],[75,122],[55,154],[56,115],[88,36],[114,-8],[110,-44],[101,28],[68,120]],[[3851,9046],[70,12],[33,16],[33,9],[31,-11],[27,-39],[12,-50],[6,-48],[12,-42],[30,-29],[4,-5]],[[4109,8859],[14,-17],[8,-26],[5,-28],[10,-28],[53,-84],[13,-34],[6,-70],[-3,-150],[17,-65],[30,-38],[130,-99],[39,-18]],[[4126,7898],[24,16],[28,76],[-5,58],[-35,77],[-20,19],[-20,-19],[-11,-46],[-12,-53],[-15,-60],[-4,-44],[70,-24]],[[5386,7904],[331,319],[338,299],[117,122],[126,82],[102,40],[95,70]],[[6495,8836],[36,-86],[44,-85],[30,-80],[32,-78],[29,-51],[43,13],[41,18],[34,-37]],[[5193,8018],[26,3],[73,28],[40,31],[7,28],[-9,37],[-7,59],[5,59],[15,28],[23,21],[25,38],[15,52],[8,45],[18,24],[44,-10],[39,28],[56,204],[32,79],[57,44],[197,48],[50,35],[90,97],[147,116],[40,54],[34,82],[72,248],[12,19]],[[6302,9515],[44,5],[45,-63],[-39,-151],[31,-138],[46,-5],[42,-15],[0,-57],[-29,-50],[32,-86],[21,-119]],[[6302,9515],[117,189],[82,166],[18,-20],[53,-40],[60,-68],[151,-262],[58,-74],[24,-45],[10,-69],[117,-165],[65,-177],[34,-16],[29,-38],[22,-44],[14,-37],[40,-74],[7,-17],[8,-11],[43,-17],[14,-10],[25,-48],[62,-162],[0,-1]],[[3170,8443],[-11,10],[-27,-13],[-27,80],[-84,63],[-166,88],[-80,94],[-35,11],[-20,11],[-89,78],[-30,48],[-15,62],[-14,111]],[[3307,9841],[10,9],[29,37],[14,0],[7,-32],[16,-112],[9,-39],[16,-33],[113,-130],[29,-23],[21,-7],[45,-8],[20,-12],[8,-17],[9,-52],[6,-22],[24,-39],[85,-91],[42,-86],[15,-85],[24,-53],[2,0]],[[3348,2926],[30,57],[11,46],[6,22],[-9,19],[-12,25],[-30,28],[-36,-12],[-36,-12],[-41,8],[-42,11]],[[3189,3118],[47,42],[33,61],[-1,8],[-5,34],[-5,31],[-29,42],[17,25],[28,42],[77,16]],[[3351,3419],[9,18],[6,13],[32,64],[45,96]],[[3443,3610],[44,-50],[44,-32],[59,54],[52,65],[-20,111],[-56,79],[-30,42],[-21,53],[16,38],[20,40]],[[3018,3902],[17,-89],[7,-56],[3,-33],[-9,-24],[-19,-49],[-23,-79],[7,-76],[38,-19],[33,-20],[29,-34],[71,11],[13,26],[40,87],[0,1],[47,21],[46,-7],[25,-62],[5,-54],[3,-27]],[[3189,3118],[-67,-61],[-67,-67],[-77,12],[-65,54]],[[2913,3056],[0,1],[21,13],[12,21],[0,26],[-12,30],[1,48],[20,23],[25,20],[15,37],[-5,47],[-21,37],[-28,24],[-28,7],[-108,-13],[-33,8],[-26,24],[-40,70],[-24,26],[-59,5],[-117,-77],[-59,-16],[-38,15],[-25,31],[-40,98],[-25,40],[-29,21],[-65,24],[-54,56],[-66,172],[-46,59],[-108,42],[-56,37]],[[2865,4475],[-24,-85],[14,-74],[39,-33],[35,-44],[59,-158],[30,-179]],[[3500,2388],[-69,-50],[-67,-56],[-56,-85],[-50,-93],[-69,54],[-19,207],[-52,7]],[[3118,2372],[-2,8],[-12,17],[-11,13],[-73,67],[-41,56],[-17,42],[-9,46],[-12,41],[-28,30],[-123,71],[-56,56],[-23,90],[22,74],[54,43],[126,30]],[[3360,3943],[-13,-30],[2,-30],[16,-17],[27,2],[13,18],[17,14]],[[3422,3900],[18,-99],[4,-81],[0,-56],[-1,-54]],[[3018,3902],[38,8],[9,1],[30,6],[36,22],[35,23],[72,12],[78,-17],[44,-14]],[[3422,3900],[-32,33],[-30,10]],[[3393,4023],[32,24],[16,54],[8,28],[14,1],[7,23],[-13,33],[-19,13],[-11,5],[-12,-9],[-26,-28],[-28,-53],[4,-67],[28,-24]],[[3575,2209],[-1,0],[-26,-28],[-23,-35],[-44,-100],[-9,-17],[-14,-14],[-28,-20],[-14,-15],[-20,-42],[-29,-87],[-28,-35],[-99,-66],[-31,-34],[-23,-38],[-48,-130],[-20,-41],[-24,-35],[-26,-28],[-28,-23],[-37,-19],[-30,-3],[-60,164],[-7,33],[-2,35],[3,35],[6,35],[3,8],[1,9],[22,91],[5,80],[-9,81],[-22,94],[-41,44],[-57,42],[-44,56],[-1,88],[39,48],[60,-10],[104,-69],[21,4],[79,74],[36,2],[15,9],[-6,20]],[[84,3539],[-24,18],[-5,8],[-19,36],[-19,108],[-17,36],[48,28],[80,18],[74,-1],[59,18],[44,32]],[[305,3840],[1,-17],[-38,-58],[-66,-26],[-71,-89],[-47,-111]],[[1698,1562],[1,1],[31,72],[-51,68],[-61,57],[-4,29],[8,27],[6,52],[10,47],[37,59],[36,59],[29,86],[31,85],[15,53],[12,56],[7,50],[11,45],[36,49],[35,53],[39,67]],[[1926,2577],[98,-62],[35,-43],[11,-23],[4,-21],[-4,-21],[-11,-19],[-42,-71],[-10,-73],[16,-75],[36,-77],[44,-83],[35,-90],[89,-324],[99,-248],[-16,-3],[-100,32],[-113,67],[-360,99],[-39,20]],[[672,3353],[-37,-153],[-30,-169],[-56,-117],[-76,-71]],[[473,2843],[-61,54],[-6,10],[-4,13],[-6,11],[-13,5],[-19,-1],[-9,2],[-43,41],[-7,21],[15,34],[-36,41],[-21,58],[-51,275],[-21,61],[-36,34],[7,8],[5,13],[-39,2],[-37,9],[-7,5]],[[305,3840],[10,7],[63,63],[65,29],[58,-38],[12,-21],[114,-187],[17,-48],[8,-53],[-3,-67],[-17,-103],[7,-41],[33,-28]],[[1110,3148],[-18,-31],[-55,-60],[-42,-82],[27,-25],[37,-19],[15,-59],[18,-62],[77,-49],[78,-51],[20,-31],[16,-30],[0,-33],[-3,-23],[15,-39],[29,6]],[[1324,2560],[19,-80],[-51,-43]],[[1292,2437],[-106,-3],[-108,-10],[-94,7],[-66,-67],[118,-112],[148,21]],[[1184,2273],[55,-26],[48,-45],[-5,-103],[-32,-88],[32,-94],[45,-87],[-11,-39],[-23,-38],[5,-62],[2,-44],[0,-1]],[[1300,1646],[-8,2],[-35,27],[-27,10],[-20,7],[-39,25],[-36,31],[-20,31],[-3,30],[5,25],[7,24],[4,29],[-8,19],[-41,24],[-16,16],[-9,24],[-13,61],[-8,23],[-16,22],[-15,12],[-15,15],[-12,29],[15,42],[-10,31],[-22,18],[-24,7],[-17,10],[0,25],[5,27],[-5,17],[-16,3],[-16,-8],[-12,-11],[-4,-5],[-178,77],[-45,-18],[-11,43],[-18,142],[-11,31],[-15,28],[-10,30]],[[581,2621],[1,0],[37,-21],[38,-15],[45,18],[44,27],[35,30],[7,63],[-12,35],[-11,34],[9,32],[11,29],[-13,79],[-26,76],[-10,75],[12,77],[18,89],[21,85],[40,79],[13,18]],[[840,3431],[43,-77],[20,-60],[17,-32],[25,-13],[81,-10],[30,-20],[54,-71]],[[1698,1562],[-88,45],[-152,2],[-97,31],[-48,2],[-13,4]],[[1184,2273],[73,60],[35,104]],[[1324,2560],[73,55],[75,38],[50,35],[38,-53],[43,-12],[36,59],[50,78],[2,2],[0,1]],[[1691,2763],[5,-14],[97,-32],[35,-37],[33,-46],[40,-41],[25,-16]],[[1110,3148],[18,-14],[20,-4],[19,5],[19,12],[18,10],[138,114],[45,24],[210,66],[10,3],[39,1],[47,-23],[39,-36],[15,-37],[1,-48],[-6,-73],[16,-131],[-8,-45],[-57,-122],[-11,-58],[9,-29]],[[6960,1130],[27,-89],[0,-25]],[[581,2621],[-32,90],[-13,28],[-16,11],[-17,27],[-14,30],[-6,20],[-9,15],[-1,1]],[[672,3353],[63,19],[49,59],[45,20],[11,-20]]],"transform":{"scale":[0.0005851769658965819,0.0003498146649665026],"translate":[44.77455855300019,38.39264475500005]}};
  Datamap.prototype.bdiTopo = '__BDI__';
  Datamap.prototype.belTopo = '__BEL__';
  Datamap.prototype.benTopo = '__BEN__';
  Datamap.prototype.bfaTopo = '__BFA__';
  Datamap.prototype.bgdTopo = '__BGD__';
  Datamap.prototype.bgrTopo = '__BGR__';
  Datamap.prototype.bhrTopo = '__BHR__';
  Datamap.prototype.bhsTopo = '__BHS__';
  Datamap.prototype.bihTopo = '__BIH__';
  Datamap.prototype.bjnTopo = '__BJN__';
  Datamap.prototype.blmTopo = '__BLM__';
  Datamap.prototype.blrTopo = '__BLR__';
  Datamap.prototype.blzTopo = '__BLZ__';
  Datamap.prototype.bmuTopo = '__BMU__';
  Datamap.prototype.bolTopo = '__BOL__';
  Datamap.prototype.braTopo = '__BRA__';
  Datamap.prototype.brbTopo = '__BRB__';
  Datamap.prototype.brnTopo = '__BRN__';
  Datamap.prototype.btnTopo = '__BTN__';
  Datamap.prototype.norTopo = '__NOR__';
  Datamap.prototype.bwaTopo = '__BWA__';
  Datamap.prototype.cafTopo = '__CAF__';
  Datamap.prototype.canTopo = '__CAN__';
  Datamap.prototype.cheTopo = '__CHE__';
  Datamap.prototype.chlTopo = '__CHL__';
  Datamap.prototype.chnTopo = '__CHN__';
  Datamap.prototype.civTopo = '__CIV__';
  Datamap.prototype.clpTopo = '__CLP__';
  Datamap.prototype.cmrTopo = '__CMR__';
  Datamap.prototype.codTopo = '__COD__';
  Datamap.prototype.cogTopo = '__COG__';
  Datamap.prototype.cokTopo = '__COK__';
  Datamap.prototype.colTopo = '__COL__';
  Datamap.prototype.comTopo = '__COM__';
  Datamap.prototype.cpvTopo = '__CPV__';
  Datamap.prototype.criTopo = '__CRI__';
  Datamap.prototype.csiTopo = '__CSI__';
  Datamap.prototype.cubTopo = '__CUB__';
  Datamap.prototype.cuwTopo = '__CUW__';
  Datamap.prototype.cymTopo = '__CYM__';
  Datamap.prototype.cynTopo = '__CYN__';
  Datamap.prototype.cypTopo = '__CYP__';
  Datamap.prototype.czeTopo = '__CZE__';
  Datamap.prototype.deuTopo = '__DEU__';
  Datamap.prototype.djiTopo = '__DJI__';
  Datamap.prototype.dmaTopo = '__DMA__';
  Datamap.prototype.dnkTopo = '__DNK__';
  Datamap.prototype.domTopo = '__DOM__';
  Datamap.prototype.dzaTopo = '__DZA__';
  Datamap.prototype.ecuTopo = '__ECU__';
  Datamap.prototype.egyTopo = '__EGY__';
  Datamap.prototype.eriTopo = '__ERI__';
  Datamap.prototype.esbTopo = '__ESB__';
  Datamap.prototype.espTopo = '__ESP__';
  Datamap.prototype.estTopo = '__EST__';
  Datamap.prototype.ethTopo = '__ETH__';
  Datamap.prototype.finTopo = '__FIN__';
  Datamap.prototype.fjiTopo = '__FJI__';
  Datamap.prototype.flkTopo = '__FLK__';
  Datamap.prototype.fraTopo = '__FRA__';
  Datamap.prototype.froTopo = '__FRO__';
  Datamap.prototype.fsmTopo = '__FSM__';
  Datamap.prototype.gabTopo = '__GAB__';
  Datamap.prototype.psxTopo = '__PSX__';
  Datamap.prototype.gbrTopo = '__GBR__';
  Datamap.prototype.geoTopo = '__GEO__';
  Datamap.prototype.ggyTopo = '__GGY__';
  Datamap.prototype.ghaTopo = '__GHA__';
  Datamap.prototype.gibTopo = '__GIB__';
  Datamap.prototype.ginTopo = '__GIN__';
  Datamap.prototype.gmbTopo = '__GMB__';
  Datamap.prototype.gnbTopo = '__GNB__';
  Datamap.prototype.gnqTopo = '__GNQ__';
  Datamap.prototype.grcTopo = '__GRC__';
  Datamap.prototype.grdTopo = '__GRD__';
  Datamap.prototype.grlTopo = '__GRL__';
  Datamap.prototype.gtmTopo = '__GTM__';
  Datamap.prototype.gumTopo = '__GUM__';
  Datamap.prototype.guyTopo = '__GUY__';
  Datamap.prototype.hkgTopo = '__HKG__';
  Datamap.prototype.hmdTopo = '__HMD__';
  Datamap.prototype.hndTopo = '__HND__';
  Datamap.prototype.hrvTopo = '__HRV__';
  Datamap.prototype.htiTopo = '__HTI__';
  Datamap.prototype.hunTopo = '__HUN__';
  Datamap.prototype.idnTopo = '__IDN__';
  Datamap.prototype.imnTopo = '__IMN__';
  Datamap.prototype.indTopo = '__IND__';
  Datamap.prototype.ioaTopo = '__IOA__';
  Datamap.prototype.iotTopo = '__IOT__';
  Datamap.prototype.irlTopo = '__IRL__';
  Datamap.prototype.irnTopo = '__IRN__';
  Datamap.prototype.irqTopo = '__IRQ__';
  Datamap.prototype.islTopo = '__ISL__';
  Datamap.prototype.isrTopo = '__ISR__';
  Datamap.prototype.itaTopo = '__ITA__';
  Datamap.prototype.jamTopo = '__JAM__';
  Datamap.prototype.jeyTopo = '__JEY__';
  Datamap.prototype.jorTopo = '__JOR__';
  Datamap.prototype.jpnTopo = '__JPN__';
  Datamap.prototype.kabTopo = '__KAB__';
  Datamap.prototype.kasTopo = '__KAS__';
  Datamap.prototype.kazTopo = '__KAZ__';
  Datamap.prototype.kenTopo = '__KEN__';
  Datamap.prototype.kgzTopo = '__KGZ__';
  Datamap.prototype.khmTopo = '__KHM__';
  Datamap.prototype.kirTopo = '__KIR__';
  Datamap.prototype.knaTopo = '__KNA__';
  Datamap.prototype.korTopo = '__KOR__';
  Datamap.prototype.kosTopo = '__KOS__';
  Datamap.prototype.kwtTopo = '__KWT__';
  Datamap.prototype.laoTopo = '__LAO__';
  Datamap.prototype.lbnTopo = '__LBN__';
  Datamap.prototype.lbrTopo = '__LBR__';
  Datamap.prototype.lbyTopo = '__LBY__';
  Datamap.prototype.lcaTopo = '__LCA__';
  Datamap.prototype.lieTopo = '__LIE__';
  Datamap.prototype.lkaTopo = '__LKA__';
  Datamap.prototype.lsoTopo = '__LSO__';
  Datamap.prototype.ltuTopo = '__LTU__';
  Datamap.prototype.luxTopo = '__LUX__';
  Datamap.prototype.lvaTopo = '__LVA__';
  Datamap.prototype.macTopo = '__MAC__';
  Datamap.prototype.mafTopo = '__MAF__';
  Datamap.prototype.marTopo = '__MAR__';
  Datamap.prototype.mcoTopo = '__MCO__';
  Datamap.prototype.mdaTopo = '__MDA__';
  Datamap.prototype.mdgTopo = '__MDG__';
  Datamap.prototype.mdvTopo = '__MDV__';
  Datamap.prototype.mexTopo = '__MEX__';
  Datamap.prototype.mhlTopo = '__MHL__';
  Datamap.prototype.mkdTopo = '__MKD__';
  Datamap.prototype.mliTopo = '__MLI__';
  Datamap.prototype.mltTopo = '__MLT__';
  Datamap.prototype.mmrTopo = '__MMR__';
  Datamap.prototype.mneTopo = '__MNE__';
  Datamap.prototype.mngTopo = '__MNG__';
  Datamap.prototype.mnpTopo = '__MNP__';
  Datamap.prototype.mozTopo = '__MOZ__';
  Datamap.prototype.mrtTopo = '__MRT__';
  Datamap.prototype.msrTopo = '__MSR__';
  Datamap.prototype.musTopo = '__MUS__';
  Datamap.prototype.mwiTopo = '__MWI__';
  Datamap.prototype.mysTopo = '__MYS__';
  Datamap.prototype.namTopo = '__NAM__';
  Datamap.prototype.nclTopo = '__NCL__';
  Datamap.prototype.nerTopo = '__NER__';
  Datamap.prototype.nfkTopo = '__NFK__';
  Datamap.prototype.ngaTopo = '__NGA__';
  Datamap.prototype.nicTopo = '__NIC__';
  Datamap.prototype.niuTopo = '__NIU__';
  Datamap.prototype.nldTopo = '__NLD__';
  Datamap.prototype.nplTopo = '__NPL__';
  Datamap.prototype.nruTopo = '__NRU__';
  Datamap.prototype.nulTopo = '__NUL__';
  Datamap.prototype.nzlTopo = '__NZL__';
  Datamap.prototype.omnTopo = '__OMN__';
  Datamap.prototype.pakTopo = '__PAK__';
  Datamap.prototype.panTopo = '__PAN__';
  Datamap.prototype.pcnTopo = '__PCN__';
  Datamap.prototype.perTopo = '__PER__';
  Datamap.prototype.pgaTopo = '__PGA__';
  Datamap.prototype.phlTopo = '__PHL__';
  Datamap.prototype.plwTopo = '__PLW__';
  Datamap.prototype.pngTopo = '__PNG__';
  Datamap.prototype.polTopo = '__POL__';
  Datamap.prototype.priTopo = '__PRI__';
  Datamap.prototype.prkTopo = '__PRK__';
  Datamap.prototype.prtTopo = '__PRT__';
  Datamap.prototype.pryTopo = '__PRY__';
  Datamap.prototype.pyfTopo = '__PYF__';
  Datamap.prototype.qatTopo = '__QAT__';
  Datamap.prototype.rouTopo = '__ROU__';
  Datamap.prototype.rusTopo = '__RUS__';
  Datamap.prototype.rwaTopo = '__RWA__';
  Datamap.prototype.sahTopo = '__SAH__';
  Datamap.prototype.sauTopo = '__SAU__';
  Datamap.prototype.scrTopo = '__SCR__';
  Datamap.prototype.sdnTopo = '__SDN__';
  Datamap.prototype.sdsTopo = '__SDS__';
  Datamap.prototype.senTopo = '__SEN__';
  Datamap.prototype.serTopo = '__SER__';
  Datamap.prototype.sgpTopo = '__SGP__';
  Datamap.prototype.sgsTopo = '__SGS__';
  Datamap.prototype.shnTopo = '__SHN__';
  Datamap.prototype.slbTopo = '__SLB__';
  Datamap.prototype.sleTopo = '__SLE__';
  Datamap.prototype.slvTopo = '__SLV__';
  Datamap.prototype.smrTopo = '__SMR__';
  Datamap.prototype.solTopo = '__SOL__';
  Datamap.prototype.somTopo = '__SOM__';
  Datamap.prototype.spmTopo = '__SPM__';
  Datamap.prototype.srbTopo = '__SRB__';
  Datamap.prototype.stpTopo = '__STP__';
  Datamap.prototype.surTopo = '__SUR__';
  Datamap.prototype.svkTopo = '__SVK__';
  Datamap.prototype.svnTopo = '__SVN__';
  Datamap.prototype.sweTopo = '__SWE__';
  Datamap.prototype.swzTopo = '__SWZ__';
  Datamap.prototype.sxmTopo = '__SXM__';
  Datamap.prototype.sycTopo = '__SYC__';
  Datamap.prototype.syrTopo = '__SYR__';
  Datamap.prototype.tcaTopo = '__TCA__';
  Datamap.prototype.tcdTopo = '__TCD__';
  Datamap.prototype.tgoTopo = '__TGO__';
  Datamap.prototype.thaTopo = '__THA__';
  Datamap.prototype.tjkTopo = '__TJK__';
  Datamap.prototype.tkmTopo = '__TKM__';
  Datamap.prototype.tlsTopo = '__TLS__';
  Datamap.prototype.tonTopo = '__TON__';
  Datamap.prototype.ttoTopo = '__TTO__';
  Datamap.prototype.tunTopo = '__TUN__';
  Datamap.prototype.turTopo = '__TUR__';
  Datamap.prototype.tuvTopo = '__TUV__';
  Datamap.prototype.twnTopo = '__TWN__';
  Datamap.prototype.tzaTopo = '__TZA__';
  Datamap.prototype.ugaTopo = '__UGA__';
  Datamap.prototype.ukrTopo = '__UKR__';
  Datamap.prototype.umiTopo = '__UMI__';
  Datamap.prototype.uryTopo = '__URY__';
  Datamap.prototype.usaTopo = '__USA__';
  Datamap.prototype.usgTopo = '__USG__';
  Datamap.prototype.uzbTopo = '__UZB__';
  Datamap.prototype.vatTopo = '__VAT__';
  Datamap.prototype.vctTopo = '__VCT__';
  Datamap.prototype.venTopo = '__VEN__';
  Datamap.prototype.vgbTopo = '__VGB__';
  Datamap.prototype.virTopo = '__VIR__';
  Datamap.prototype.vnmTopo = '__VNM__';
  Datamap.prototype.vutTopo = '__VUT__';
  Datamap.prototype.wlfTopo = '__WLF__';
  Datamap.prototype.wsbTopo = '__WSB__';
  Datamap.prototype.wsmTopo = '__WSM__';
  Datamap.prototype.yemTopo = '__YEM__';
  Datamap.prototype.zafTopo = '__ZAF__';
  Datamap.prototype.zmbTopo = '__ZMB__';
  Datamap.prototype.zweTopo = '__ZWE__';

  /**************************************
                Utilities
  ***************************************/

  //convert lat/lng coords to X / Y coords
  Datamap.prototype.latLngToXY = function(lat, lng) {
     return this.projection([lng, lat]);
  };

  //add <g> layer to root SVG
  Datamap.prototype.addLayer = function( className, id, first ) {
    var layer;
    if ( first ) {
      layer = this.svg.insert('g', ':first-child')
    }
    else {
      layer = this.svg.append('g')
    }
    return layer.attr('id', id || '')
      .attr('class', className || '');
  };

  Datamap.prototype.updateChoropleth = function(data) {
    var svg = this.svg;
    for ( var subunit in data ) {
      if ( data.hasOwnProperty(subunit) ) {
        var color;
        var subunitData = data[subunit]
        if ( ! subunit ) {
          continue;
        }
        else if ( typeof subunitData === "string" ) {
          color = subunitData;
        }
        else if ( typeof subunitData.color === "string" ) {
          color = subunitData.color;
        }
        else {
          color = this.options.fills[ subunitData.fillKey ];
        }
        //if it's an object, overriding the previous data
        if ( subunitData === Object(subunitData) ) {
          this.options.data[subunit] = defaults(subunitData, this.options.data[subunit] || {});
          var geo = this.svg.select('.' + subunit).attr('data-info', JSON.stringify(this.options.data[subunit]));
        }
        svg
          .selectAll('.' + subunit)
          .transition()
            .style('fill', color);
      }
    }
  };

  Datamap.prototype.updatePopup = function (element, d, options) {
    var self = this;
    element.on('mousemove', null);
    element.on('mousemove', function() {
      var position = d3.mouse(self.options.element);
      d3.select(self.svg[0][0].parentNode).select('.datamaps-hoverover')
        .style('top', ( (position[1] + 30)) + "px")
        .html(function() {
          var data = JSON.parse(element.attr('data-info'));
          try {
            return options.popupTemplate(d, data);
          } catch (e) {
            return "";
          }
        })
        .style('left', ( position[0]) + "px");
    });

    d3.select(self.svg[0][0].parentNode).select('.datamaps-hoverover').style('display', 'block');
  };

  Datamap.prototype.addPlugin = function( name, pluginFn ) {
    var self = this;
    if ( typeof Datamap.prototype[name] === "undefined" ) {
      Datamap.prototype[name] = function(data, options, callback, createNewLayer) {
        var layer;
        if ( typeof createNewLayer === "undefined" ) {
          createNewLayer = false;
        }

        if ( typeof options === 'function' ) {
          callback = options;
          options = undefined;
        }

        options = defaults(options || {}, self.options[name + 'Config']);

        //add a single layer, reuse the old layer
        if ( !createNewLayer && this.options[name + 'Layer'] ) {
          layer = this.options[name + 'Layer'];
          options = options || this.options[name + 'Options'];
        }
        else {
          layer = this.addLayer(name);
          this.options[name + 'Layer'] = layer;
          this.options[name + 'Options'] = options;
        }
        pluginFn.apply(this, [layer, data, options]);
        if ( callback ) {
          callback(layer);
        }
      };
    }
  };

  // expose library
  if (typeof exports === 'object') {
    d3 = require('d3');
    topojson = require('topojson');
    module.exports = Datamap;
  }
  else if ( typeof define === "function" && define.amd ) {
    define( "datamaps", ["require", "d3", "topojson"], function(require) {
      d3 = require('d3');
      topojson = require('topojson');

      return Datamap;
    });
  }
  else {
    window.Datamap = window.Datamaps = Datamap;
  }

  if ( window.jQuery ) {
    window.jQuery.fn.datamaps = function(options, callback) {
      options = options || {};
      options.element = this[0];
      var datamap = new Datamap(options);
      if ( typeof callback === "function" ) {
        callback(datamap, options);
      }
      return this;
    };
  }
})();
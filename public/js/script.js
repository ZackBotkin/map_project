
var app = angular.module('StateApp', []);

app.controller('StateCtrl', [
    '$scope', '$http',

    function($scope, $http) {

        var map = new Datamap({
            element : document.getElementById('container'),
            scope : 'usa',
            height: 1000,       /// figure out a way to automatically grab the size
            done: function(datamap) {
                datamap.svg.selectAll('.datamaps-subunit').on('click', function(geography) {

                    var code = geography.id;
                    var parms = {code : code};
                    $http.get('/state', {params : parms}).then(
                        function(response) {
                            alert(JSON.stringify(response.data));
                        },
                        function(error) {

                        }
                    );

                });
            } 
        });

    }

]);


var app = angular.module('StateApp', []);

app.controller('StateCtrl', [
    '$scope', '$http',
    function($scope, $http) {

        function getApprovalRating(stateCode) {
            return $http.get('/approval', {params : {code : stateCode}});
        }

        function printApprovalRating(geography) {
            var code = geography.id;
            getApprovalRating(code).then(
                function (response) {
                    alert(response.data.rating);
                },
                function (error) {
                    alert(JSON.stringify(error));
                }
            );
        }

        function drawDataMap() {
            var map = new Datamap({
                element : document.getElementById('container'),
                scope : 'usa',
                height: 1000,       /// figure out a way to automatically grab the size
                done: function(datamap) {
                    datamap.svg.selectAll('.datamaps-subunit').on('click', printApprovalRating);
                } 
            });
        }

        function init() {
            drawDataMap();
        }


        //MAIN 
        init();


    }

]);

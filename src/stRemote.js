// Adds infinite scrolling & AJAX sort/search. See readme.md for usage.

ng.module('smart-table')
  .directive('stRemote', ['$timeout', '$http', function ($timeout, $http) {
    return {
      restrict: 'A',
      require: 'stTable',
      scope: {
        stRemote: '=',
        stTable: '='
      },
      link: function (scope, element, attr, ctrl) {
        // Options
        var opts = ng.copy(scope.stRemote) || {};
        opts.pageSize = (opts.pageSize === false ? Infinity : opts.pageSize) || 20;
        opts.queryLabels = ng.extend({page: 'page', size: 'size', sort: 'sort', order: 'order', search: 'search'}, opts.queryLabels);
        opts.error = opts.error || function(){};

        // Other variables
        var tableState = ctrl.tableState();
        var pagination = tableState.pagination;
        var lengthThreshold = 50;   // Next load triggered if scroll/resize leads to fewer remaining scroll length in px below
        var timeThreshold = 400;    // Time in ms after which scroll/resize event will regarded to be finished
        var promise = null;
        var lastRemaining = Infinity;
        var itemsTotal = Infinity;
        var infiniteScrollingActive = true;

        // Container for scrolling
        var container;
        var winContainer = false;
        if (opts.container) {
          if (opts.container === 'window' || opts.container === 'document') {
            container = angular.element(window[opts.container]);
            winContainer = true;
          } else {
            container = angular.element($(opts.container));
          }
        } else {
          container = angular.element(element.parent());
        }
        if (!container) {
          console.error('Unable to initialise stRemote: container "' + opts.container + '"" not found');
          return;
        }
        if (!winContainer && container[0].style.overflowY !== 'auto' && container[0].style.overflowY !== 'scroll') {
          console.log('Infinite scroll container "'+ container[0] +'" may not display scroll bars');
        }

        // Define custom pipe handler
        ctrl.preventPipeOnWatch();
        ctrl.pipe = function () {
          // Determine parameters
          var d = {};
          if (opts.pageSize !== Infinity) {
            d.size = tableState && pagination.number ? pagination.number : opts.pageSize;
            d.page = tableState ? pagination.start/d.size + 1 : 1;
          }
          if (tableState.sort.predicate) {
            d.sort = tableState.sort.predicate;
            d.order = tableState.sort.reverse ? 'desc' : 'asc';
          }
          if (tableState.search.predicateObject && tableState.search.predicateObject.$) {
            d.search = tableState.search.predicateObject.$;
          }
          var params = {};
          ng.forEach(opts.queryLabels, function(value, key) { if (key in d) {params[value] = d[key];} });

          if (ng.isFunction(opts.beforeRequest)) {
            config = opts.beforeRequest();
          }

          var config = {method: 'GET', url: opts.url, params: params};
          if (ng.isFunction(opts.queryTransform)) {
            config = opts.queryTransform(config);
          }
          // Execute GET
          $http(config)
          .success(function (data, status, headers, config) {
            // Determine & add new items
            var items = [];
            if (opts.itemsProperty) {
              items = data[opts.itemsProperty];
            } else if (ng.isArray(data)) {
              items = data;
            } else {
              ng.forEach(data, function(value, key) {
                if (ng.isArray(value)) { // First array found on next level
                  items = value;
                }
              });
            }

            var total = 0; // Total number of items that ultimately can be delivered from the backend
            if (opts.totalProperty) {
              total = data[opts.totalProperty];
            } else if (data.total) {
              total = data.total;
            }

            // if backend has more items than itemsTotal, adjust itemsTotal so that more pages are loaded for infinite scrolling.
            if (total > itemsTotal) {
              itemsTotal = total;
            }

            if (d.page > 1) {
              scope.stTable = scope.stTable.concat(items);
            } else {
              scope.stTable = items;
            }

            // Success callback
            if (ng.isFunction(opts.success)) {
              opts.success.apply(this, arguments);
            }
            // Check whether end has been reached
            if (items.length < d.size || opts.pageSize === Infinity) {
              itemsTotal = scope.stTable.length;
            } else {
              // After current $digest, load more items if container doesn't have scroll bars yet
              $timeout(function() {
                if (items.length) {
                  if (getRemainingHeight() < lengthThreshold) {
                    // Make sure all stTable elements are displayed, otherwise
                    // an infinite loop can occur
                    var rows = 0;
                    angular.forEach(element[0].getElementsByTagName('tr'), function(el) {
                      if (el.hasAttribute('ng-repeat')) {rows++;}
                    });
                    if (rows === scope.stTable.length) {
                      loadNextPage();
                    }
                  }
                }
              }, 0, false);
            }
          })
          .error(opts.error);
        };

        // Initialise infinite scrolling
        if (opts.pageSize !== Infinity) {
          container.bind('scroll', scrollHandler);

          // Handling of window resize
          var endOfResizeTimeout;
          window.onresize = function () {
            clearTimeout(endOfResizeTimeout);
            endOfResizeTimeout = setTimeout(scrollHandler, timeThreshold);
          };

          // Events
          scope.$on('stRemote.refresh', function () {
            pagination.start = 0;
            itemsTotal = Infinity;
            ctrl.pipe();
          });
          scope.$on('stRemote.pauseInfiniteScrolling', function () {
            infiniteScrollingActive = false;
          });
          scope.$on('stRemote.unpauseInfiniteScrolling', function () {
            infiniteScrollingActive = true;
            // Trigger handler once, in case scroll or windows size changed while paused
            scrollHandler();
          });
        }

        if (!opts.preventImmediateLoad) {
          // Call custom pipe once to start loading the table
          ctrl.pipe();
        }

        // Helpers
        function getRemainingHeight () {
          return winContainer ?
                 document.documentElement.scrollHeight - (window.innerHeight + window.pageYOffset) :
                 container[0].scrollHeight - (container[0].clientHeight + container[0].scrollTop);
        }

        function loadNextPage () {
          ctrl.slice(pagination.start + opts.pageSize, opts.pageSize);
        }

        function scrollHandler () {
          if (infiniteScrollingActive) {
            if (pagination.start + opts.pageSize >= itemsTotal) { return; }
            pagination.numberOfPages = itemsTotal;
            var remaining = getRemainingHeight();
            // Length threshold reached and scrolling down
            if (remaining < lengthThreshold && remaining < lastRemaining) {
              // Restart timer
              $timeout.cancel(promise);
              promise = $timeout(function () {
                loadNextPage();
                promise = null;
              }, timeThreshold);
            }
            lastRemaining = remaining;
          }
        }
      }
    };
  }]);

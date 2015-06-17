/** 
* @version 2.1.1
* @license MIT
*/
(function (ng, undefined){
    'use strict';

ng.module('smart-table', []).run(['$templateCache', function ($templateCache) {
    $templateCache.put('template/smart-table/pagination.html',
        '<nav ng-if="numPages && pages.length >= 2"><ul class="pagination">' +
        '<li ng-repeat="page in pages" ng-class="{active: page==currentPage}"><a ng-click="selectPage(page)">{{page}}</a></li>' +
        '</ul></nav>');
}]);


ng.module('smart-table')
  .constant('stConfig', {
    pagination: {
      template: 'template/smart-table/pagination.html',
      itemsByPage: 10,
      displayedPages: 5
    },
    search: {
      delay: 400, // ms
      inputEvent: 'input'
    },
    select: {
      mode: 'single',
      selectedClass: 'st-selected'
    },
    sort: {
      ascentClass: 'st-sort-ascent',
      descentClass: 'st-sort-descent',
      skipNatural: false
    },
    pipe: {
      delay: 100 //ms
    }
  });
ng.module('smart-table')
  .controller('stTableController', ['$scope', '$parse', '$filter', '$attrs', function StTableController ($scope, $parse, $filter, $attrs) {
    var propertyName = $attrs.stTable;
    var displayGetter = $parse(propertyName);
    var displaySetter = displayGetter.assign;
    var safeGetter;
    var orderBy = $filter('orderBy');
    var filter = $filter('filter');
    var safeCopy = copyRefs(displayGetter($scope));
    var tableState = {
      sort: {},
      search: {},
      pagination: {
        start: 0
      }
    };
    var filtered;
    var pipeAfterSafeCopy = true;
    var ctrl = this;
    var lastSelected;

    function copyRefs (src) {
      return src ? [].concat(src) : [];
    }

    function updateSafeCopy () {
      safeCopy = copyRefs(safeGetter($scope));
      if (pipeAfterSafeCopy === true) {
        ctrl.pipe();
      }
    }

    function deepDelete(object, path) {
      if (path.indexOf('.') != -1) {
          var partials = path.split('.');
          var key = partials.pop();
          var parentPath = partials.join('.'); 
          var parentObject = $parse(parentPath)(object)
          delete parentObject[key]; 
          if (Object.keys(parentObject).length == 0) {
            deepDelete(object, parentPath);
          }
        } else {
          delete object[path];
        }
    }

    if ($attrs.stSafeSrc) {
      safeGetter = $parse($attrs.stSafeSrc);
      $scope.$watch(function () {
        var safeSrc = safeGetter($scope);
        return safeSrc ? safeSrc.length : 0;

      }, function (newValue, oldValue) {
        if (newValue !== safeCopy.length) {
          updateSafeCopy();
        }
      });
      $scope.$watch(function () {
        return safeGetter($scope);
      }, function (newValue, oldValue) {
        if (newValue !== oldValue) {
          updateSafeCopy();
        }
      });
    }

    /**
     * sort the rows
     * @param {Function | String} predicate - function or string which will be used as predicate for the sorting
     * @param [reverse] - if you want to reverse the order
     */
    this.sortBy = function sortBy (predicate, reverse) {
      tableState.sort.predicate = predicate;
      tableState.sort.reverse = reverse === true;

      if (ng.isFunction(predicate)) {
        tableState.sort.functionName = predicate.name;
      } else {
        delete tableState.sort.functionName;
      }

      tableState.pagination.start = 0;
      return this.pipe();
    };

    /**
     * search matching rows
     * @param {String} input - the input string
     * @param {String} [predicate] - the property name against you want to check the match, otherwise it will search on all properties
     */
    this.search = function search (input, predicate) {
      var predicateObject = tableState.search.predicateObject || {};
      var prop = predicate ? predicate : '$';

      input = ng.isString(input) ? input.trim() : input;
      $parse(prop).assign(predicateObject, input);
      // to avoid to filter out null value
      if (!input) {
        deepDelete(predicateObject, prop);
      }
      tableState.search.predicateObject = predicateObject;
      tableState.pagination.start = 0;
      return this.pipe();
    };

    /**
     * this will chain the operations of sorting and filtering based on the current table state (sort options, filtering, ect)
     */
    this.pipe = function pipe () {
      var pagination = tableState.pagination;
      var output;
      filtered = tableState.search.predicateObject ? filter(safeCopy, tableState.search.predicateObject) : safeCopy;
      if (tableState.sort.predicate) {
        filtered = orderBy(filtered, tableState.sort.predicate, tableState.sort.reverse);
      }
      if (pagination.number !== undefined) {
        pagination.numberOfPages = filtered.length > 0 ? Math.ceil(filtered.length / pagination.number) : 1;
        pagination.start = pagination.start >= filtered.length ? (pagination.numberOfPages - 1) * pagination.number : pagination.start;
        output = filtered.slice(pagination.start, pagination.start + parseInt(pagination.number));
      }
      displaySetter($scope, output || filtered);
    };

    /**
     * select a dataRow (it will add the attribute isSelected to the row object)
     * @param {Object} row - the row to select
     * @param {String} [mode] - "single" or "multiple" (multiple by default)
     */
    this.select = function select (row, mode) {
      var rows = copyRefs(displayGetter($scope));
      var index = rows.indexOf(row);
      if (index !== -1) {
        if (mode === 'single') {
          row.isSelected = row.isSelected !== true;
          if (lastSelected) {
            lastSelected.isSelected = false;
          }
          lastSelected = row.isSelected === true ? row : undefined;
        } else {
          rows[index].isSelected = !rows[index].isSelected;
        }
      }
    };

    /**
     * take a slice of the current sorted/filtered collection (pagination)
     *
     * @param {Number} start - start index of the slice
     * @param {Number} number - the number of item in the slice
     */
    this.slice = function splice (start, number) {
      tableState.pagination.start = start;
      tableState.pagination.number = number;
      return this.pipe();
    };

    /**
     * return the current state of the table
     * @returns {{sort: {}, search: {}, pagination: {start: number}}}
     */
    this.tableState = function getTableState () {
      return tableState;
    };

    this.getFilteredCollection = function getFilteredCollection () {
      return filtered || safeCopy;
    };

    /**
     * Use a different filter function than the angular FilterFilter
     * @param filterName the name under which the custom filter is registered
     */
    this.setFilterFunction = function setFilterFunction (filterName) {
      filter = $filter(filterName);
    };

    /**
     * Use a different function than the angular orderBy
     * @param sortFunctionName the name under which the custom order function is registered
     */
    this.setSortFunction = function setSortFunction (sortFunctionName) {
      orderBy = $filter(sortFunctionName);
    };

    /**
     * Usually when the safe copy is updated the pipe function is called.
     * Calling this method will prevent it, which is something required when using a custom pipe function
     */
    this.preventPipeOnWatch = function preventPipe () {
      pipeAfterSafeCopy = false;
    };
  }])
  .directive('stTable', function () {
    return {
      restrict: 'A',
      controller: 'stTableController',
      link: function (scope, element, attr, ctrl) {

        if (attr.stSetFilter) {
          ctrl.setFilterFunction(attr.stSetFilter);
        }

        if (attr.stSetSort) {
          ctrl.setSortFunction(attr.stSetSort);
        }
      }
    };
  });

ng.module('smart-table')
  .directive('stSearch', ['stConfig', '$timeout','$parse', function (stConfig, $timeout, $parse) {
    return {
      require: '^stTable',
      link: function (scope, element, attr, ctrl) {
        var tableCtrl = ctrl;
        var promise = null;
        var throttle = attr.stDelay || stConfig.search.delay;
        var event = attr.stInputEvent || stConfig.search.inputEvent;

        attr.$observe('stSearch', function (newValue, oldValue) {
          var input = element[0].value;
          if (newValue !== oldValue && input) {
            ctrl.tableState().search = {};
            tableCtrl.search(input, newValue);
          }
        });

        //table state -> view
        scope.$watch(function () {
          return ctrl.tableState().search;
        }, function (newValue, oldValue) {
          var predicateExpression = attr.stSearch || '$';
          if (newValue.predicateObject && $parse(predicateExpression)(newValue.predicateObject) !== element[0].value) {
            element[0].value = $parse(predicateExpression)(newValue.predicateObject) || '';
          }
        }, true);

        // view -> table state
        element.bind(event, function (evt) {
          evt = evt.originalEvent || evt;
          if (promise !== null) {
            $timeout.cancel(promise);
          }

          promise = $timeout(function () {
            tableCtrl.search(evt.target.value, attr.stSearch || '');
            promise = null;
          }, throttle);
        });
      }
    };
  }]);

ng.module('smart-table')
  .directive('stSelectRow', ['stConfig', function (stConfig) {
    return {
      restrict: 'A',
      require: '^stTable',
      scope: {
        row: '=stSelectRow'
      },
      link: function (scope, element, attr, ctrl) {
        var mode = attr.stSelectMode || stConfig.select.mode;
        element.bind('click', function () {
          scope.$apply(function () {
            ctrl.select(scope.row, mode);
          });
        });

        scope.$watch('row.isSelected', function (newValue) {
          if (newValue === true) {
            element.addClass(stConfig.select.selectedClass);
          } else {
            element.removeClass(stConfig.select.selectedClass);
          }
        });
      }
    };
  }]);

ng.module('smart-table')
  .directive('stSort', ['stConfig', '$parse', function (stConfig, $parse) {
    return {
      restrict: 'A',
      require: '^stTable',
      link: function (scope, element, attr, ctrl) {

        var predicate = attr.stSort;
        var getter = $parse(predicate);
        var index = 0;
        var classAscent = attr.stClassAscent || stConfig.sort.ascentClass;
        var classDescent = attr.stClassDescent || stConfig.sort.descentClass;
        var stateClasses = [classAscent, classDescent];
        var sortDefault;
        var skipNatural = attr.stSkipNatural !== undefined ? attr.stSkipNatural : stConfig.sort.skipNatural;

        if (attr.stSortDefault) {
          sortDefault = scope.$eval(attr.stSortDefault) !== undefined ? scope.$eval(attr.stSortDefault) : attr.stSortDefault;
        }

        //view --> table state
        function sort () {
          index++;
          predicate = ng.isFunction(getter(scope)) ? getter(scope) : attr.stSort;
          if (index % 3 === 0 && !!skipNatural !== true) {
            //manual reset
            index = 0;
            ctrl.tableState().sort = {};
            ctrl.tableState().pagination.start = 0;
            ctrl.pipe();
          } else {
            ctrl.sortBy(predicate, index % 2 === 0);
          }
        }

        element.bind('click', function sortClick () {
          if (predicate) {
            scope.$apply(sort);
          }
        });

        if (sortDefault) {
          index = sortDefault === 'reverse' ? 1 : 0;
          sort();
        }

        //table state --> view
        scope.$watch(function () {
          return ctrl.tableState().sort;
        }, function (newValue) {
          if (newValue.predicate !== predicate) {
            index = 0;
            element
              .removeClass(classAscent)
              .removeClass(classDescent);
          } else {
            index = newValue.reverse === true ? 2 : 1;
            element
              .removeClass(stateClasses[index % 2])
              .addClass(stateClasses[index - 1]);
          }
        }, true);
      }
    };
  }]);

ng.module('smart-table')
  .directive('stPagination', ['stConfig', function (stConfig) {
    return {
      restrict: 'EA',
      require: '^stTable',
      scope: {
        stItemsByPage: '=?',
        stDisplayedPages: '=?',
        stPageChange: '&'
      },
      templateUrl: function (element, attrs) {
        if (attrs.stTemplate) {
          return attrs.stTemplate;
        }
        return stConfig.pagination.template;
      },
      link: function (scope, element, attrs, ctrl) {

        scope.stItemsByPage = scope.stItemsByPage ? +(scope.stItemsByPage) : stConfig.pagination.itemsByPage;
        scope.stDisplayedPages = scope.stDisplayedPages ? +(scope.stDisplayedPages) : stConfig.pagination.displayedPages;

        scope.currentPage = 1;
        scope.pages = [];

        function redraw () {
          var paginationState = ctrl.tableState().pagination;
          var start = 1;
          var end;
          var i;
          var prevPage = scope.currentPage;
          scope.currentPage = Math.floor(paginationState.start / paginationState.number) + 1;

          start = Math.max(start, scope.currentPage - Math.abs(Math.floor(scope.stDisplayedPages / 2)));
          end = start + scope.stDisplayedPages;

          if (end > paginationState.numberOfPages) {
            end = paginationState.numberOfPages + 1;
            start = Math.max(1, end - scope.stDisplayedPages);
          }

          scope.pages = [];
          scope.numPages = paginationState.numberOfPages;

          for (i = start; i < end; i++) {
            scope.pages.push(i);
          }

          if (prevPage !== scope.currentPage) {
            scope.stPageChange({newPage: scope.currentPage});
          }
        }

        //table state --> view
        scope.$watch(function () {
          return ctrl.tableState().pagination;
        }, redraw, true);

        //scope --> table state  (--> view)
        scope.$watch('stItemsByPage', function (newValue, oldValue) {
          if (newValue !== oldValue) {
            scope.selectPage(1);
          }
        });

        scope.$watch('stDisplayedPages', redraw);

        //view -> table state
        scope.selectPage = function (page) {
          if (page > 0 && page <= scope.numPages) {
            ctrl.slice((page - 1) * scope.stItemsByPage, scope.stItemsByPage);
          }
        };

        if (!ctrl.tableState().pagination.number) {
          ctrl.slice(0, scope.stItemsByPage);
        }
      }
    };
  }]);

ng.module('smart-table')
  .directive('stPipe', ['stConfig', '$timeout', function (config, $timeout) {
    return {
      require: 'stTable',
      scope: {
        stPipe: '='
      },
      link: {

        pre: function (scope, element, attrs, ctrl) {

          var pipePromise = null;

          if (ng.isFunction(scope.stPipe)) {
            ctrl.preventPipeOnWatch();
            ctrl.pipe = function () {

              if (pipePromise !== null) {
                $timeout.cancel(pipePromise)
              }

              pipePromise = $timeout(function () {
                scope.stPipe(ctrl.tableState(), ctrl);
              }, config.pipe.delay);

              return pipePromise;
            }
          }
        },

        post: function (scope, element, attrs, ctrl) {
          ctrl.pipe();
        }
      }
    };
  }]);

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
          scope.$on('stRemote.refresh', function (){
            ctrl.pipe();
          });
          scope.$on('stRemote.pauseInfiniteScrolling', function (){
            infiniteScrollingActive = false;
          });
          scope.$on('stRemote.unpauseInfiniteScrolling', function (){
            infiniteScrollingActive = true;
            // Trigger handler once, in case scroll or windows size changed while paused
            scrollHandler();
          });
        }

        // Call custom pipe once to start loading the table
        ctrl.pipe();

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

})(angular);
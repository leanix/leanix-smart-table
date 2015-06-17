# leanIX Smart Table fork
This is a for of [Angular Smart Table](https://github.com/lorenzofox3/Smart-Table), mainly adding infinite scroll & sort & search via AJAX.

## Usage:

See example.html ([code](https://github.com/leanix/leanix-smart-table/blob/master/example.html), [preview](https://htmlpreview.github.io/?https://github.com/leanix/leanix-smart-table/blob/master/example.html)) for an example implementation. The stRemote directive is triggered with the attribute `st-remote="options"` on the table tag.

The following options are supported:

- __url__: GET endpoint (e.g., `'https://api.github.com/search/repositories'`)
- __pageSize__: Number of items to be retrieved per GET request; set this to `false` to disable paging
- __container__: Container to be used for infinite scrolling, `'parent'`, `'document'` or a selector (in which case jquery needs to be included)
- __queryLabels__: Rename any of the query labels (page, size, sort, order, search; e.g. `{search: 'q', size: 'per_page'}`
- __queryTransform__: Transform $http config object before request is sent
  Example:
  ```
  queryTransform: function(config) {
    if ('sort' in config.params) {
      config.params.sort = config.params.sort + '_' + config.params.order;
      delete config.params.order;
    }
    return config;
  }
  ```
- __itemsProperty__: Property in the retrieved data that contains the array of items. If empty, the first array found will be taken. (e.g. `'items'`)
- __success__: $http success callback with arguments `(data, status, headers, config)`; the data will only be available in the collection at the end of the current $digest cycle; call `$timeout(function(){}, 0, false)` from within the success callback to postpone execution of code until then.
- __error__: $http error callback with arguments `(data, status, headers, config)`

If a container is specified but `pageSize` is too small to generate a scrollbar, the AJAX call will be repeated until the scroll bar becomes visible.

In addition, the events `stRemote.pauseInfiniteScrolling` and `stRemote.pauseInfiniteScrolling` are defined to allow pausing & unpausing infinite scroll.

# Smart Table
[![Gitter](https://badges.gitter.im/Join Chat.svg)](https://gitter.im/lorenzofox3/Smart-Table?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Smart table is a table module for angular js. It allows you to quickly compose your table in a declarative way including sorting, filtering, row selection pagination.
It is lightweight (around 3kb minified) and has no other dependencies than Angular itself.
Check the [documentation](http://lorenzofox3.github.io/smart-table-website/) website for more details

## submitting an issue

Please be responsible, the open source community is not there to guess your problem or to do your job. When submitting an issue try as much as possible to:

1. search in the already existing issues or on [stackoverflow](http://stackoverflow.com/questions/tagged/smart-table?sort=newest&pageSize=30) if your issue has not been raised before.

2. give a precise description mentionning angular version, smart-table version.

3. give a way to reproduce your issue, the best would be with a <strong>running example</strong>, you can use [plunkr](http://plnkr.co/) (smart-table is the list of available packages). Note if you want to mimic ajax loading behaviour you can use [$timeout](https://docs.angularjs.org/api/ng/service/$timeout) angular service or [$httpBackend](https://docs.angularjs.org/api/ng/service/$httpBackend).

4. isolate your code sample on the probable issue to avoid pollution and noise.

5. Close your issue when a solution has been found (and share it with the community)

Note that 80% of the open issues are actually not issues but "problem" due to developpers laziness or lack of investigation. These "issues" are a waste of time for us and especially if we have to setup a sample to reproduce the issue which those developpers could have done. Any open issue which does not fulfill this contract will be closed without investigation.

## Install

the easiest way is to run `bower install angular-smart-table`, then you just have to add the script and register the module `smart-table` to you application

## Test

run `npm install` after you have installed the dependencies (`npm install` and `bower install`)

## custom builds

smart-table is based around a main directive which generate a top level controller whose API can be accessed by sub directives
(plugins), if you don't need some of these, simply edit the gulpfile (the pluginList variable) and run `gulp build`

## Older versions

Smart-Table used to be configuration based and if you rely on this version, you can still access the code on the [0.2.x](https://github.com/lorenzofox3/Smart-Table/tree/vx.2.x) branch. You will be able to find the documentation related to this version
[here](https://github.com/lorenzofox3/smart-table-website) (simply open index.html in a browser).

Note, I have closed all the issues related to these versions as people get confused when reading these issues and commented on them like it was related to the newer version. Feel free to reopen any of them (or open a new one), but don't forget to mention it is related to the older versions.

## License

Smart Table module is under MIT license:

> Copyright (C) 2014 Laurent Renard.
>
> Permission is hereby granted, free of charge, to any person
> obtaining a copy of this software and associated documentation files
> (the "Software"), to deal in the Software without restriction,
> including without limitation the rights to use, copy, modify, merge,
> publish, distribute, sublicense, and/or sell copies of the Software,
> and to permit persons to whom the Software is furnished to do so,
> subject to the following conditions:
>
> The above copyright notice and this permission notice shall be
> included in all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
> EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
> MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
> NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
> BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
> ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
> CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
> SOFTWARE.

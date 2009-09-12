//  jquery.pkg 1.0d1
//      Copyright (c) 2009 Jonathan 'Wolf' Rentzsch: <http://rentzsch.com>
//      Some rights reserved: <http://opensource.org/licenses/mit-license.php>
//      
//  jQuery plugin for lightweight browser-side javascript source packages.
//  See <http://github.com/rentzsch/jquery.pkg> for details.
//
//  Compatibility: IE 6-8, Firefox 3-3.5, Safari 3-4, Chrome 3.

jQuery.extend({
    pkg: function(){
        var pkgName,
            pkgSpec,
            packageLoaded;
        
        switch (arguments.length) {
            case 0:
                throw 'jQuery.pkg(): no arguments supplied';
                break;
            case 1:
                pkgName = 'index';
                pkgSpec = arguments[0];
                break;
            case 2:
                pkgName = arguments[0];
                pkgSpec = arguments[1];
                break;
            default:
                throw 'jQuery.pkg(): too many arguments supplied';
        }
        
        // Normalize the require clause into an array.
        if (pkgSpec.require === undefined) {
            pkgSpec.require = [];
        } else if (typeof pkgSpec.require === 'string') {
            pkgSpec.require = [pkgSpec.require];
        }
        
        jQuery.pkg.loadedPackages.push({name:pkgName,spec:pkgSpec});
        console.log('pkg: loaded "'+pkgName+'" pkg');
        
        jQuery.each(pkgSpec.require, function(index, requiredURI){
            var requiredName = requiredURI.match(/[^/]+$/)[0];
            console.log('pkg: "'+pkgName+'" requires "'+requiredName+'" ('+requiredURI+')');
            if (jQuery.inArray(requiredName, jQuery.pkg.loadQueue) === -1) {
                packageLoaded = false;
                jQuery.each(jQuery.pkg.loadedPackages, function(index, loadedPackage){
                    if (loadedPackage.name === requiredName) {
                        packageLoaded = true;
                        return false;
                    }
                });
                if (!packageLoaded) {
                    jQuery.pkg.loadQueue.push(requiredURI);
                    console.log('pkg: queued "'+requiredURI+'" for loading');
                }
            }
        });
    }
});

jQuery.pkg.loadedPackages = [];
jQuery.pkg.loadQueue = [];

jQuery.pkg.loadedPackageByName = function(name){
    var packageIt;
    for (packageIt in jQuery.pkg.loadedPackages) {
        packageIt = jQuery.pkg.loadedPackages[packageIt];
        if (packageIt.name === name) {
            return packageIt;
        }
    }
    console.log('package named '+name+' not found', jQuery.pkg.loadedPackages);
}

$(document).ready(function(){
    jQuery.pkg.loadOnePackageFromQueue = function(){
        var uri, dependancies = [];
        if (jQuery.pkg.loadQueue.length) {
            uri = jQuery.pkg.loadQueue.pop();
            console.log('pkg: loading "'+uri+'"');
            jQuery.getScript(uri, function(data, textStatus){
                if (data !== undefined && data.length === 0) {
                    console.log('pkg: ERROR failed to load '+uri);
                } else {
                    jQuery.pkg.loadOnePackageFromQueue();
                }
            });
        } else {
            // All packages loaded. Enumerate dependancies into an unsorted list.
            jQuery.each(jQuery.pkg.loadedPackages, function(index, loadedPackage){
                jQuery.each(loadedPackage.spec.require, function(index, requiredPackageURI){
                    var requiredPackageName = requiredPackageURI.match(/[^/]+$/)[0];
                    dependancies.push([requiredPackageName, loadedPackage.name]);
                });
            });
            console.log('pkg: unsorted dependancies',dependancies);
            
            // Sort the dependancies.
            dependancies = tsort(dependancies);
            console.log('pkg: sorted dependancies',dependancies);
            
            // Call init on them in-order.
            jQuery.each(dependancies, function(packageIndex, packageURI){
                jQuery.pkg.loadedPackageByName(packageURI).spec.init();
            });
        }
    }
    jQuery.pkg.loadOnePackageFromQueue();
});


function tsort(nodeNamePairs) {
    var nodeNamePairIndex,
        nodeNamePair,
        beforeNodeName,
        afterNodeName,
        beforeNode,
        afterNode,
        nodes = new JWRTSortNodeCollection();
        
    for (nodeNamePairIndex in nodeNamePairs){
        nodeNamePair = nodeNamePairs[nodeNamePairIndex];
        
        beforeNodeName = nodeNamePair[0];
        afterNodeName = nodeNamePair[1];
        
        beforeNode = nodes.nodeWithName(beforeNodeName);
        afterNode = nodes.nodeWithName(afterNodeName);
        
        afterNode.addDependancy(beforeNode);
    }
    return nodes.sortedNodeNames();
}


function JWRSet(sourceArray){
    this._elements = {};
    this._length = 0;
    if (sourceArray !== undefined) {
        this.addFromArray(sourceArray);
    }
}
JWRSet.prototype.contains = function(element){
    if (typeof element === 'string') {
        return element in this._elements;
    } else {
        if (element.__uuid__ === undefined) {
            return false;
        } else {
            return element.__uuid__ in this._elements;
        }
    }
}
JWRSet.prototype.add = function(element){
    var uuid = element;
    
    if (typeof element !== 'string') {
        if (element.__uuid__ === undefined) {
            element.__uuid__ = Math.uuid();
        }
        uuid = element.__uuid__;
    }
    
    if (!(uuid in this._elements)) {
        this._elements[uuid] = element;
        this._length++;
    }
}
JWRSet.prototype.remove = function(element){
    var uuid = element;
    
    if (typeof element !== 'string') {
        if (element.__uuid__ === undefined) {
            return; // Couldn't be in set since we annotate all non-strings.
        }
        uuid = element.__uuid__;
    }
    
    if (uuid in this._elements) {
        delete this._elements[uuid];
        this._length--;
    }
}
JWRSet.prototype.length = function(){
    return this._length;
}
JWRSet.prototype.toArray = function(){
    var elementKey,
        result = [];
    
    for (elementKey in this._elements) {
        result.push(this._elements[elementKey]);
    }
    return result;
}
JWRSet.prototype.addFromArray = function(array){
    var arrayIndex = 0;
    
    for (; arrayIndex < array.length; arrayIndex++) {
        this.add(array[arrayIndex]);
    }
}
JWRSet.unique = function(array){
    return (new JWRSet(array)).toArray();
}


function JWRTSortNode(name){
    this._name = name;
    this._parents = new JWRSet();
    this._children = new JWRSet();
}
JWRTSortNode.prototype.addDependancy = function(node) {
	if (node._parents.contains(this)) {
		throw new Error('tsort: circular dependancy between "'+this._name+'" and "'+node._name+'"');
	}
    this._parents.add(node);
    node._children.add(this);
}


function JWRTSortNodeCollection(){
    this._storage = {};
}
JWRTSortNodeCollection.prototype.nodeWithName = function(name){
    var result = this._storage[name];
    if (!result) {
        result = new JWRTSortNode(name);
        this._storage[name] = result;
    }
    return result;
}
JWRTSortNodeCollection.prototype._rootNodes = function(){
    var nodeName, node, result = [];
    for (nodeName in this._storage) {
        node = this._storage[nodeName];
        if (node._parents.length() === 0) {
            result.push(node);
        }
    }
    return result;
}
JWRTSortNodeCollection.prototype.sortedNodeNames = function(){
    var result = [];
    
    function collectNodeNamesBreadthFirst(nodes, nodeNames){
        var nodeIndex, node, children;
        for (nodeIndex = 0; nodeIndex < nodes.length; nodeIndex++) {
            node = nodes[nodeIndex];
            nodeNames.push(node._name);
        }
        for (nodeIndex = 0; nodeIndex < nodes.length; nodeIndex++) {
            node = nodes[nodeIndex];
            collectNodeNamesBreadthFirst(node._children.toArray(), nodeNames);
        }
    };
    
    collectNodeNamesBreadthFirst(this._rootNodes(), result);
    
    return JWRSet.unique(result);
}


// Stolen from http://www.broofa.com/Tools/Math.uuid.js by Robert Kieffer.
// Go read his big-ass disclaimer+usage JSDoc there.
Math.uuid = (function() {
  // Private array of chars to use
  var CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split(''); 

  return function (len, radix) {
    var chars = CHARS, uuid = [], rnd = Math.random;
    radix = radix || chars.length;

    if (len) {
      // Compact form
      for (var i = 0; i < len; i++) uuid[i] = chars[0 | rnd()*radix];
    } else {
      // rfc4122, version 4 form
      var r;

      // rfc4122 requires these characters
      uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
      uuid[14] = '4';

      // Fill in random data.  At i==19 set the high bits of clock sequence as
      // per rfc4122, sec. 4.1.5
      for (var i = 0; i < 36; i++) {
        if (!uuid[i]) {
          r = 0 | rnd()*16;
          uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r & 0xf];
        }
      }
    }

    return uuid.join('');
  };
})();
jQuery.pkg({
    require: [
        'http://cloud.github.com/downloads/rentzsch/Math.uuid.js/Math.uuid.js-1.4.pkg.js'
    ],
    init: function(){
        test('direct load of Math.uuid.js',function(){
            equals(Math.uuid().length, 36);
        });
    }
});
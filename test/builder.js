
/**
 * Module dependencies.
 */

var Builder = require('..')
  , assert = require('better-assert')
  , exec = require('child_process').exec
  , path = require('path')
  , resolve = path.resolve
  , fs = require('fs')
  , vm = require('vm')
  , realpath = fs.realpathSync
  , exists = fs.existsSync
  , read = fs.readFileSync;

describe('Builder', function(){
  describe('.buildScripts(fn)', function(){
    it('should build the scripts', function(done){
      var builder = new Builder('test/fixtures/hello');
      builder.addLookup('test/fixtures');
      builder.buildScripts(function(err, js){
        if (err) return done(err);
        var out = read('test/fixtures/hello-js.js', 'utf8');
        js.trim().should.equal(out.trim());
        done();
      })
    })

    it('should buffer components only once', function(done){
      var builder = new Builder('test/fixtures/boot');
      builder.addLookup('test/fixtures');
      builder.buildScripts(function(err, js){
        if (err) return done(err);
        var out = read('test/fixtures/ignore.js', 'utf8');
        js.trim().should.equal(out.trim());
        done();
      })
    })

    it('should emit "dependency" events', function(done){
      var builder = new Builder('test/fixtures/hello');
      builder.addLookup('test/fixtures');
      builder.on('dependency', function(builder){
        builder.dir.should.be.a('string');
        builder.basename.should.equal('component-emitter');
        done();
      });
      builder.buildScripts(function(){});
    })
  })

  describe('.buildStyles(fn)', function(){
    it('should build the styles', function(done){
      var builder = new Builder('test/fixtures/hello');
      builder.addLookup('test/fixtures');
      builder.buildStyles(function(err, css){
        if (err) return done(err);
        var out = read('test/fixtures/hello.css', 'utf8');
        css.should.equal(out);
        done();
      })
    })

    it('should emit "dependency" events', function(done){
      var builder = new Builder('test/fixtures/hello');
      builder.addLookup('test/fixtures');
      builder.on('dependency', function(builder){
        builder.dir.should.be.a('string');
        builder.basename.should.equal('component-emitter');
        done();
      });
      builder.buildStyles(function(){});
    })
  })

  describe('.build(fn)', function(){
    beforeEach(function(done){
      exec('rm -fr /tmp/build', done);
    })

    it('should build js', function(done){
      var builder = new Builder('test/fixtures/hello');
      builder.addLookup('test/fixtures');
      builder.build(function(err, res){
        if (err) return done(err);
        var out = read('test/fixtures/hello.js', 'utf8');
        res.js.trim().should.equal(out.trim());
        done();
      })
    })

    it('should build css', function(done){
      var builder = new Builder('test/fixtures/hello');
      builder.addLookup('test/fixtures');
      builder.build(function(err, res){
        if (err) return done(err);
        var out = read('test/fixtures/hello.css', 'utf8');
        res.css.should.equal(out);
        done();
      })
    })

    it('should load the require.js script', function(done){
      var builder = new Builder('test/fixtures/hello');
      builder.addLookup('test/fixtures');
      builder.build(function(err, res){
        if (err) return done(err);
        var out = require('component-require');
        res.require.should.equal(out);
        done();
      })
    })

    it('should be idempotent', function(done){
      var builder = new Builder('test/fixtures/hello');
      builder.addLookup('test/fixtures');
      builder.build(function(err, a){
        if (err) return done(err);

        var builder = new Builder('test/fixtures/hello');
        builder.addLookup('test/fixtures');
        builder.build(function(err, b){
          if (err) return done(err);
          b.js.should.equal(a.js);
          b.css.should.equal(a.css);

          var builder = new Builder('test/fixtures/hello');
          builder.addLookup('test/fixtures');
          builder.build(function(err, c){
            if (err) return done(err);
            c.js.should.equal(a.js);
            c.css.should.equal(a.css);
            done();
          })
        })
      })
    })

    it('should symlink .images', function(done){
      var builder = new Builder('test/fixtures/assets');
      builder.addLookup('test/fixtures');
      builder.copyAssetsTo('/tmp/build');
      builder.build(function(err, res){
        if (err) return done(err);
        assert(3 == res.images.length);
        assert('/tmp/build/assets/images/logo.png' == res.images[0]);
        assert('/tmp/build/assets/images/maru.jpeg' == res.images[1]);
        assert('/tmp/build/assets/images/npm.png' == res.images[2]);
        assert(exists('/tmp/build/assets/images/maru.jpeg'));
        assert(exists('/tmp/build/assets/images/logo.png'));
        assert(exists('/tmp/build/assets/images/npm.png'));
        done();
      });
    })

    it('should symlink .files', function(done){
      var builder = new Builder('test/fixtures/assets-parent');
      builder.addLookup('test/fixtures');
      builder.copyAssetsTo('/tmp/build');
      builder.build(function(err, res){
        if (err) return done(err);
        assert(1 == res.files.length);
        assert('/tmp/build/assets/some.txt' == res.files[0]);
        var real = realpath('/tmp/build/assets/some.txt');
        var path = resolve('test/fixtures/assets/some.txt');
        assert(real == path);
        assert(exists('/tmp/build/assets/some.txt'));
        done();
      });
    })

    it('should copy .images in copyFiles mode', function(done){
      var builder = new Builder('test/fixtures/assets');
      builder.copyFiles();
      builder.addLookup('test/fixtures');
      builder.copyAssetsTo('/tmp/build');
      builder.build(function(err, res){
        if (err) return done(err);
        assert(3 == res.images.length);
        assert('/tmp/build/assets/images/logo.png' == res.images[0]);
        assert('/tmp/build/assets/images/maru.jpeg' == res.images[1]);
        assert('/tmp/build/assets/images/npm.png' == res.images[2]);
        assert(exists('/tmp/build/assets/images/maru.jpeg'));
        assert(exists('/tmp/build/assets/images/logo.png'));
        assert(exists('/tmp/build/assets/images/npm.png'));
        // images aren't symlinks
        fs.lstat('/tmp/build/assets/images/npm.png', function(err, stats) {
          assert(stats.isSymbolicLink() == false);
          done();
        });
      });
    })

    it('should copy .files in copyFiles mode', function(done){
      var builder = new Builder('test/fixtures/assets-parent');
      builder.copyFiles();
      builder.addLookup('test/fixtures');
      builder.copyAssetsTo('/tmp/build');
      builder.build(function(err, res){
        if (err) return done(err);
        assert(1 == res.files.length);
        assert('/tmp/build/assets/some.txt' == res.files[0]);
        assert(exists('/tmp/build/assets/some.txt'));
        // files aren't symlinks
        fs.lstat('/tmp/build/assets/some.txt', function(err, stats) {
          assert(stats.isSymbolicLink() == false);
          done();
        });
      });
    })

    it('should rewrite css urls', function(done){
      var builder = new Builder('test/fixtures/assets-parent');
      builder.addLookup('test/fixtures');
      builder.copyAssetsTo('/tmp/build');
      builder.prefixUrls('build');
      builder.build(function(err, res){
        if (err) return done(err);
        res.css.should.include('url("build/assets/./images/logo.png")');
        res.css.should.include('url("build/assets/./images/maru.jpeg")');
        res.css.should.include('url("build/assets/css/../images/npm.png")');
        res.css.should.include('url(http://example.com/images/manny.png)');
        res.css.should.include('url(/public/images/foo.png)')
        res.css.should.include('url(data:image/png;base64,PNG DATA HERE)');
        done();
      });
    })
  })

  it('should build local dependencies', function(done){
    var builder = new Builder('test/fixtures/bundled');
    builder.addLookup('test/fixtures/lib/components');
    builder.build(function(err, res){
      if (err) return done(err);
      res.js.should.include('foo/index.js');
      done();
    })
  })

  it('should error on failed dep lookup', function(done){
    var builder = new Builder('test/fixtures/bundled');
    builder.build(function(err, res){
      err.message.should.equal('failed to lookup "hello"\'s dependency "foo"');
      done();
    })
  })

  it('should not fail on directory name collisions', function(done){
    var builder = new Builder('test/fixtures/collision');
    builder.build(done);
  })

  it('should not build development dependencies by default', function(done){
    var builder = new Builder('test/fixtures/dev-deps');
    builder.addLookup('test/fixtures');
    builder.build(function(err, res){
      if (err) return done(err);
      res.js.should.include('component-emitter/index.js');
      res.js.should.not.include('component-jquery/index.js');
      done();
    })
  })

  it('should add implicit ./components dir to lookup paths', function(done){
    var builder = new Builder('test/fixtures/app');
    builder.build(function(err, res){
      if (err) return done(err);
      res.js.should.include('foo/index.js');
      res.js.should.include('bar/index.js');
      done();
    })
  })

  describe('.addLookup(path)', function(){
    it('should add a global lookup path', function(done){
      var builder = new Builder('test/fixtures/lookups/deep');
      builder.addLookup('test/fixtures');
      builder.build(function(err, res){
        if (err) return done(err);
        var out = read('test/fixtures/lookups-deep-js.js', 'utf8');
        res.js.trim().should.equal(out.trim());
        done();
      })
    })
  })

  describe('.development()', function(){
    it('should build development dependencies', function(done){
      var builder = new Builder('test/fixtures/dev-deps');
      builder.addLookup('test/fixtures');
      builder.development();
      builder.build(function(err, res){
        if (err) return done(err);
        res.js.should.include('component-emitter/index.js');
        res.js.should.include('component-jquery/index.js');
        done();
      })
    })
  })

  describe('.addSourceURLs()', function() {
    it('should add source urls to the build', function(done){
      var builder = new Builder('test/fixtures/hello');
      builder.addLookup('test/fixtures');
      builder.addSourceURLs();
      builder.buildScripts(function(err, js){
        if (err) return done(err);
        var out = read('test/fixtures/hello-sourceurl-js.js', 'utf8');
        js.trim().should.equal(out.trim());
        done();
      })
    })
  });

  describe('.ignore(name)', function(){
    it('should ignore the given component and its deps', function(done){
      var builder = new Builder('test/fixtures/hello');
      builder.addLookup('test/fixtures');
      builder.ignore('component/emitter');
      builder.build(function(err, res){
        if (err) return done(err);
        var out = read('test/fixtures/hello-ignore.js', 'utf8');
        res.js.trim().should.equal(out.trim());
        done();
      })
    })
  })

  it('should support nested "paths"', function(done){
    var builder = new Builder('test/fixtures/nested');
    builder.build(function(err, res){
      if (err) return done(err);
      var js = res.require + res.js + ';require("nested")';
      var ret = vm.runInNewContext(js);
      assert('two' == ret);
      done();
    })
  })

  it('should add root "paths" relative to the component', function(done){
    var builder = new Builder('test/fixtures/lookups/deep2');
    builder.build(function(err, res){
      if (err) return done(err);
      var out = read('test/fixtures/lookups-deep-js.js', 'utf8').replace(/deep\//g, 'deep2/');
      res.js.trim().should.equal(out.trim());
      done();
    })
  })

  describe('absolute .paths lookup', function() {
    var tempComponentPath = path.resolve('test/fixtures/lookups/absolute/component.json');
    before(function() {
      // Generate a component.json with an absolute path
      var lookupPath = path.resolve('test/fixtures');
      var baseComponent = { 
        name: "absolute", 
        description: "a component for testing absolute lookup paths",
        dependencies: {
          "component-dialog": "*"
        },
        scripts: ["index.js"],
        paths: [
          lookupPath
        ]
      };

      fs.writeFileSync(tempComponentPath, JSON.stringify(baseComponent));
    });

    after(function() {
      // Remove the component.json after the test
      fs.unlinkSync(tempComponentPath);
    });

    it('should handle absolute paths', function(done) {
      var builder = new Builder('test/fixtures/lookups/absolute');
      builder.build(function(err, res) {
        if(err) return done(err);
        var out = read('test/fixtures/lookups-absolute-js.js', 'utf8');
        res.js.trim().should.equal(out.trim());
        done();
      })
    })
  })

  it('should support "main"', function(done){
    var builder = new Builder('test/fixtures/main-boot');
    builder.addLookup('test/fixtures');
    builder.build(function(err, res){
      if (err) return done(err);
      res.js.should.include('require.alias("boot/boot.js", "boot/index.js")');
      res.js.should.include('require.alias("main/foo.js", "boot/deps/main/index.js")');
      done();
    })
  })

  it('should support root-level "main"', function(done){
    var builder = new Builder('test/fixtures/main-boot');
    builder.addLookup('test/fixtures');
    builder.build(function(err, res){
      if (err) return done(err);
      res.js.should.include('require.alias("boot/boot.js", "boot/index.js")');
      res.js.should.include('require.alias("main/foo.js", "boot/deps/main/index.js")');
      res.js.should.include('require.alias("main/foo.js", "main/index.js")');
      done();
    })
  })

  it('should expose name aliases for root dependencies', function(done){
    var builder = new Builder('test/fixtures/root-aliases');
    builder.addLookup('test/fixtures/components');
    builder.build(function(err, res){
      if (err) return done(err);
      var js = res.require + res.js;
      var ret = vm.runInNewContext(js + '\nrequire("jquery")');
      ret.should.equal('jquery');
      done();
    })
  })
})

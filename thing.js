function viewportSize(){
	var test = document.createElement( "div" );

	test.style.cssText = "position: fixed;top: 0;left: 0;bottom: 0;right: 0;";
	document.documentElement.insertBefore( test, document.documentElement.firstChild );
	
	var dims = { width: test.offsetWidth, height: test.offsetHeight };
	document.documentElement.removeChild( test );
	
	return dims;
}
function rnd(a,b) {
    return Math.random()*(b-a)+a;
}

function box_muller(sd) {
    var u1 = Math.random();
    var u2 = Math.random();
    var sqrt = Math.sqrt(-2*Math.log(u1));
    var arg = 2*Math.PI*u2;
    return {x:sqrt*Math.cos(arg)*sd, y:sqrt*Math.sin(arg)*sd};
}

function Tool() {
    var tool = this;
    var dimensions = viewportSize();
    this.width = dimensions.width;
    this.height = dimensions.height-4;
    this.minx = -6.1;
    this.maxx = 6.1;
    this.miny = -20.5;
    this.maxy = 20.5;
    this.ox = this.mx = 0;
    this.oy = this.my = 0;
    this.limit = 10;
    this.accuracy = 6;
    this.dot_size = Math.max(1,Math.sqrt(this.width*this.width+this.height*this.height)/800);
    this.dot_alpha = 0.8/this.dot_size;
    this.abs_mod = 2;

    this.debug = document.getElementById('debug');
    this.canvas = document.getElementById('zeta');
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.ctx = this.canvas.getContext('2d');

    this.canvas.addEventListener('mousemove',function(e) {
        tool.mx = e.clientX;
        tool.my = e.clientY;
    });
    this.canvas.addEventListener('touchmove',function(e) {
        tool.mx = e.touches[0].clientX;
        tool.my = e.touches[0].clientY;
        e.preventDefault();
    });

    this.draw_axes();

    function frame() {
        tool.update();
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}
Tool.prototype = {
    colour: function(z) {
        var hue = z.arg()*(180/Math.PI);
        var lumin = (z.abs()%this.abs_mod)/this.abs_mod*(hue%15+15)/30*60+30;
        return 'hsla('+hue+',100%,'+lumin+'%,'+this.dot_alpha+')';
    },

    draw_axes: function() {
        var c = this.ctx;

        c.beginPath();
        c.strokeStyle = 'hsl(0,0%,85%)';
        for(var x=Math.ceil(this.minx);x<=this.maxx;x++) {
            for(var y=Math.floor(this.maxy);y>=this.miny;y--) {
                var hl = this.world_to_canvas(this.minx,y);
                var hr = this.world_to_canvas(this.maxx,y);
                c.moveTo(hl.x,hl.y);
                c.lineTo(hr.x,hr.y);
                var vt = this.world_to_canvas(x,this.miny);
                var vb = this.world_to_canvas(x,this.maxy);
                c.moveTo(vt.x,vt.y);
                c.lineTo(vb.x,vb.y);
            }
        }
        c.stroke();

        c.beginPath();
        c.strokeStyle = c.fillStyle = 'hsl(0,0%,50%)';

        var hl = this.world_to_canvas(this.minx,0);
        var hr = this.world_to_canvas(this.maxx,0);
        c.moveTo(hl.x,hl.y);
        c.lineTo(hr.x,hr.y);
        c.stroke();
        var vt = this.world_to_canvas(0,this.miny);
        var vb = this.world_to_canvas(0,this.maxy);
        c.moveTo(vt.x,vt.y);
        c.lineTo(vb.x,vb.y);
        c.stroke();

        c.textAlign = 'center';
        for(var x=Math.ceil(this.minx);x<=this.maxx;x++) {
            if(x==0) {
                continue;
            }
            var p = this.world_to_canvas(x,0);
            c.fillText(x,p.x,p.y-10);
            c.moveTo(p.x,p.y-3);
            c.lineTo(p.x,p.y+3);
        }
        for(var y=Math.floor(this.maxy);y>=this.miny;y--) {
            if(y==0) {
                continue;
            }
            var p = this.world_to_canvas(0,y);
            c.fillText(y,p.x-10,p.y);
            c.moveTo(p.x-3,p.y);
            c.lineTo(p.x+3,p.y);
        }
    },


    screen_to_world: function(x,y) {
        var r = this.canvas.getBoundingClientRect();
        x = this.minx+(this.maxx-this.minx)*(x-r.left)/this.width;
        y = this.maxy+(this.miny-this.maxy)*(y-r.top)/this.height;
        return {x:x,y:y};
    },

    world_to_canvas: function(x,y) {
        x = (x-this.minx)*this.width/(this.maxx-this.minx);
        y = (y-this.maxy)*this.height/(this.miny-this.maxy);
        return {x:x,y:y};
    },

    update: function() {

        var dx = this.mx - this.ox;
        var dy = this.my - this.oy;
        var d = Math.sqrt(dx*dx+dy*dy);

        var spread = Math.sqrt(this.limit);

        var t = new Date();
        for(var i=0;i<this.limit;i++) {
            var o = box_muller(spread);
            var lambda = rnd(0,1.2);
            var x = this.ox + lambda*dx + o.x;
            var y = this.oy + lambda*dy + o.y;
            var p = this.screen_to_world(x,y);
            if(p.x>=-this.width/2 && p.x<=this.width/2 && p.y>=-this.height/2 && p.y<=this.height/2) {
                this.draw_dot(p.x,p.y);
            }
        }
        var nt = new Date();
        var delta = nt-t
        var fps = 1000/20.0
        this.limit += (fps-delta);
        this.limit = Math.max(this.limit,1);
        debug.innerHTML = this.limit+'<br>'+delta;

        this.ox = this.mx;
        this.oy = this.my;
    },

    draw_dot: function(x,y) {
        var z = zeta3(Complex(x,y),this.accuracy);
        this.ctx.fillStyle = this.colour(z);

        var r = this.world_to_canvas(x,y);
        var cx = r.x;
        var cy = r.y;
        var size = Math.abs(box_muller(this.dot_size).x)+1;
        this.ctx.fillRect(cx,cy,size,size);
    }
}

var tool = new Tool();

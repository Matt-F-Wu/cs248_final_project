'float x_threshold = 32.;',
'float y_threshold = 24.;',

'float x = abs(newPosition.x);',
'float y = abs(newPosition.y);',

'if(x > x_threshold || y > y_threshold){',

'	float x_i = y_threshold * x / y;',
'	float y_i = x_threshold * y / x;',

'	if(y_i < y_threshold && x_i > x_threshold){',
'		float x_e = x - x_threshold;',
'		float y_e = x_e * y / x;',
'		if(newPosition.x > 0.){',
'			newPosition.x -= x_e;',
'		}else{',
'			newPosition.x += x_e;',
'		}',

'		if(newPosition.y > 0.){',
'			newPosition.y += y_e;',
'		}else{',
'			newPosition.y -= y_e;',
'		}',
'	}',

'	if(y_i >= y_threshold && x_i <= x_threshold){',
'		float y_e = y - y_threshold;',
'		float x_e = x * y_e / y;',

'		if(newPosition.x > 0.){',
'			newPosition.x += x_e;',
'		}else{',
'			newPosition.x -= x_e;',
'		}',

'		if(newPosition.y > 0.){',
'			newPosition.y -= y_e;',
'		}else{',
'			newPosition.y += y_e;',
'		}',
'	}',
'}',
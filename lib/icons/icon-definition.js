"use strict";

const {caseKludge, escapeRegExp, forceNonCapturing, fuzzyRegExp, isNumeric, isRegExp} = require("../utils/general.js");


/**
 * Intermediate representation of an uncompiled {@link Icon} object.
 *
 * Generated from human-readable CSON source during compilation.
 * Written to disk as JavaScript arrays to quicken startup time.
 *
 * @class
 */
class IconDefinition{
	
	/**
	 * Define a new icon from loaded CSON/JSON source.
	 *
	 * @param {String}        key - Name of config key which defined this icon.
	 * @param {String}       icon - Icon's CSS class.
	 * @param {RegExp}      match - Pattern that matches file/directory paths.
	 * @param {String[]}   colour - Colour classes used by this icon.
	 * @param {Object} [props={}] - Additional/advanced properties.
	 */
	constructor(key, icon, match, colour, props = {}){
		this.key   = key;
		this.icon  = icon;
		this.match = match;
		
		this.setColours(colour);
		this.setPriority(props.priority);
		this.setInterpreter(props.interpreter);
		
		if(props.scope){
			this.setScope(props.scope);
			this.setName(props.alias, props.generic, props.noFuzz);
		}
		
		// Whether to match against a full path instead of a filename
		if(props.matchPath)
			this.matchPath = true;
		
		// Improve performance by forcing all groups to be non-capturing
		this.match = forceNonCapturing(this.match);
		
		if(this.lang)        this.lang        = forceNonCapturing(this.lang);
		if(this.interpreter) this.interpreter = forceNonCapturing(this.interpreter);
		if(this.scope)       this.scope       = forceNonCapturing(this.scope);
	}
	
	
	/**
	 * Define the CSS classes for displaying the icon's colour.
	 *
	 * @param {String[]} classes
	 * @private
	 */
	setColours(classes){
		
		if("string" === typeof classes){
			const auto = classes.match(/^auto-(\w+)/i);
			this.colour = auto
				? ["medium-" + auto[1], "dark-" + auto[1]]
				: [classes, classes];
		}
		
		else if(Array.isArray(classes)){
			this.colour = classes;
			if(this.colour[1] == null)
				this.colour[1] = this.colour[0];
		}
		
		else this.colour = [null, null];
	}
	
	
	/**
	 * Define the order in which the icon is matched before others.
	 *
	 * @param {Number} [priority=1]
	 * @private
	 */
	setPriority(priority){
		this.priority = isNumeric(priority)
			? +priority
			: (priority || 1);
	}
	
	
	/**
	 * Define the executable names to match in interpreter directives.
	 *
	 * @param {String|RegExp} pattern
	 * @private
	 */
	setInterpreter(pattern){
		if(!pattern) return;
		this.interpreter = !isRegExp(pattern)
			? new RegExp("^" + pattern + "$")
			: pattern;
	}
	
	
	/**
	 * Define the language grammars which trigger the icon.
	 *
	 * @param {String|RegExp} pattern - Grammar scopes
	 * @private
	 */
	setScope(pattern){
		if(!pattern) return;
		this.scope = !isRegExp(pattern)
			? new RegExp(`\\.${escapeRegExp(pattern)}$`, "i")
			: pattern;
	}
	
	
	/**
	 * Construct a pattern to match the icon's human-readable names.
	 *
	 * The definition's config key is always included unless `noKey` is set.
	 *
	 * @param {String|RegExp}  [alias] - Additional patterns to match as names
	 * @param {Boolean}  [noKey=false] - Omit the config key when generating pattern.
	 * @param {Boolean} [noFuzz=false] - Disable fuzzy-matching in string expressions.
	 * @private
	 */
	setName(alias = null, noKey = false, noFuzz = false){
		
		if(alias){
			if(isRegExp(alias))
				this.lang = alias;
			
			else{
				const source = noFuzz
					? escapeRegExp(alias)
					: fuzzyRegExp(alias, String);
				this.lang = new RegExp("^" + source + "$", "i");
			}
		}
		
		// Nothing more to do here.
		if(noKey) return;
		
		const {key} = this;
		const keyDiffersToAlias = isRegExp(alias)
			? !alias.test(key)
			: (!alias || key.toLowerCase() !== alias.toLowerCase());
		
		// Add the alias only if it matches something the key doesn't
		if(keyDiffersToAlias){
			const keyPattern = this.lang && !this.lang.ignoreCase
				? caseKludge(key, !noFuzz)
				: noFuzz
					? fuzzyRegExp(key, String)
					: escapeRegExp(key);
			
			const source = this.lang
				? `^${keyPattern}$|${this.lang.source}`
				: `^${keyPattern}$`;
			
			const flags = this.lang
				? this.lang.flags
				: "i";
			
			this.lang = new RegExp(source, flags);
		}
	}
	
	
	/**
	 * Concatenate the instance's patterns with those of another definition.
	 *
	 * @param {IconDefinition} input
	 */
	merge(input){
		const src  = this.match.source + "|" + input.match.source;
		this.match = new RegExp(src, this.match.flags);
		
		if(!this.alias       && input.alias)       this.alias       = input.alias;
		if(!this.scope       && input.scope)       this.scope       = input.scope;
		if(!this.interpreter && input.interpreter) this.interpreter = input.interpreter;
	}
	
	
	/**
	 * Stringify a value for JavaScript output.
	 *
	 * @param {*} input
	 * @return {String}
	 */
	stringify(input){
		if(null === input)  return "null";
		if(isRegExp(input)) return input.toString();
		return JSON.stringify(input);
	}
	
	
	/**
	 * Generate the JavaScript code to define this definition's {@link Icon}.
	 *
	 * @return {String}
	 */
	toString(){
		
		// Order of values must match what Icon's constructor expects
		let args = [
			this.icon,
			this.colour,
			this.match,
			this.matchPath,
			this.interpreter,
			this.scope,
			this.lang
		];
		
		// Shorten array by pruning trailing null values.
		for(let i = 6; i >= 0; --i)
			if(null == args[i])
				args.pop();
			else break;
		
		if(args[3] === false && args.length === 4)
			args.pop();
		
		return "[" + args.map(this.stringify).join(",") + "]";
	}
	
	
	/**
	 * Force stringification when converted to JSON.
	 *
	 * @return {String}
	 */
	toJSON(){
		return this.toString();
	}
}


Object.assign(IconDefinition.prototype, {
	icon:        null,
	colour:      null,
	match:       null,
	matchPath:   false,
	interpreter: null,
	scope:       null,
	lang:        null
});


module.exports = IconDefinition;
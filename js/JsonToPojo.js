
function jsonToPojoConverter() {
	var instance = {};
	
	function mergeArrayObjects(objArray) {
		var result = {};
	
		for (var i = 0; i < objArray.length; i++) {
			for (var field in objArray[i]) {
				if (!result.hasOwnProperty(field)) {
					result[field] = objArray[i][field];
				}
			}
		}
	
		return result;
	}

	function capitalize(str) {
		return str[0].toUpperCase() + str.slice(1);
	}

    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    function toCamel(str) {
    	var camel = str.replace(/_([a-z])/g, function (g) { return g[1].toUpperCase(); });
        return camel
    }

	function getJavaType(type) {
		switch(type) {
			case 'array': 
				return '';
			case 'object': 			
			case 'String':
			case 'NSDate': // should be String?
			case 'Int':
			case 'Double':
			case 'Bool':
				return  capitalize(type);
			default:
                if (type == "boolean") {
                    return "Bool"
                }
			    return capitalizeFirstLetter(type);
		}
	}

	function getType(val) {
		var typeInfo = {
			'type': typeof val
		};
	
		switch(typeInfo.type) {
			case 'object':
				// if the object is an array, get type of array content
				// otherwise, get the definition of the object value itself
				if (Array.isArray(val)) {			
					typeInfo.type = 'array';
				
					if (typeof val[0] === 'object') {
						typeInfo.definition = getType(mergeArrayObjects(val));						
					} else {
						typeInfo.definition = getType(val[0]);
					}
				} else {
					typeInfo.definition = getObjectDefinition(val);
				}
		
				break;		
			case 'string':
				if (/(\d{2}|\d{4})[\-\\\/]\d{1,2}[\-\\\/]\d{1,2}/.test(val)) {
					typeInfo.type = 'NSDate';
				}
		
				break;		
			case 'number':
				if (Number.isInteger(val)) {
					typeInfo.type = 'Int';
				} else {
					typeInfo.type = 'Double';
				}
		
				break;
		}

		return typeInfo;
	}

	function getObjectDefinition(obj) {
		var objectDefinition = {};
	
		// create a definition object that contains a map
		// of field names to field types, recursing on object
		// field types
		for (field in obj) {
			objectDefinition[field] = getType(obj[field]);
		}
	
		return objectDefinition;
	}

    function getFieldName(name, type) {
        if (type.indexOf('[') != -1) {
            if (name[name.length-1] == 's') {
                console.log("String contains s at the end.")
                return name
            } else {
                return name + 's'
            }
        } else {
            return name
        }
    }

    function getFieldNameIfList(str) {
        if (str[str.length-1] == 's') {
            console.log("String contains s at the end.")
            return str
        } else {
            return str + 's'
        }
    }

    // entity class
	function getJavaClassDefinition(className, fields) {
		var result = '';

	    result += 'import UIKit\n';
        result += 'import ObjectMapper\n\n\n';

		result += 'class ' + className + 'Entity: Mappable {\n\n';
	
		// output list of fields
		for (var i = 0; i < fields.length; i++) {
			result += '    var '  + getFieldName(fields[i].camelName, fields[i].typeDeclaration) + ': ' + fields[i].typeDeclaration + '?\n';
		}
	
		result += '\n\n';
	
		// mapper func
        result += '    required init?(_ map: Map) {\n';
        result += '    }     \n\n'

        result += '    func mapping(map: Map) { \n';
        		for (var i = 0; i < fields.length; i++) {
        		    if (fields[i].typeDeclaration == 'NSDate') {
                        result += '        self.' + fields[i].camelName + ' <- (map["'+fields[i].originalFieldName+'"], DateAndTime()) \n';
                        continue
                    }
                    result += '        self.' + fields[i].camelName + ' <- map["'+fields[i].originalFieldName+'"] \n';
        		}
        result += '    }     \n';
        result += '}\n\n';

		return result;
	}


    // domain class
	function getDomainClassDefinition(className, fields) {
		var result = '';

	    result += 'import UIKit\n\n\n';

		result += 'class ' + className + 'Domain {\n\n';

		// output list of fields
		for (var i = 0; i < fields.length; i++) {
			result += '    var '  + fields[i].camelName + ': ' + fields[i].typeDeclaration + '?\n';
		}

		result += '\n\n';

        result += '    init(entity: '+className+'Entity) { \n';
        		for (var i = 0; i < fields.length; i++) {
        		    if (fields[i].typeDeclaration == 'NSDate') {
        		        result += '        self.' + fields[i].camelName + ' = entity.'+fields[i].camelName+' ?? . \n';
        		        continue
        		    }

        		    result += '        self.' + fields[i].camelName + ' = entity.'+fields[i].camelName+' ?? . \n';
        		}
        result += '    }     \n';
        result += '}\n\n';

		return result;
	}



	instance.convert = function(json, firstClassName) {
		try {
			var objectDefinition = getObjectDefinition( JSON.parse(json) );	
		} catch(ex) {
		    alert("\nCo Ty wyprawiasz? Nudzi Ci sie? Zepsules cos w JSONie! \n\n\n NAPRAW TO!!!\n\n\n")
			return ex;
		}
		var classQueue = [
			{
				'name': firstClassName,
				'definition': objectDefinition
			} 
		];

		var result = '';			

		while(classQueue.length > 0) {
			var fields = [];

			//cls to są klasy
			var cls = classQueue.shift();

			for (var field in cls.definition) {
				var type = cls.definition[field].type;
				var arrayType = '';
				var objType = undefined;
			
				if (type === 'array') {
					if (cls.definition[field].definition.type === 'object') {
						classQueue.push({
							'name': capitalize(field) + '',
							'definition': cls.definition[field].definition.definition,
							'camelName': toCamel(capitalize(field))
						});
						arrayType = '[' + capitalize(field) + ']'
					} else {
						arrayType = '[' + capitalize(cls.definition[field].definition.type) + ']';
					}
				}
			
				if (type === 'object') {
					objType = capitalize(field) + 'Type';
					classQueue.push({
						'name': objType,
						'definition': cls.definition[field].definition
					});
				}
			
				var typeDeclaration = objType ? objType : getJavaType(type) + arrayType;						

                var fieldName = getFieldName(field, typeDeclaration)
				fields.push({
				    'originalFieldName': field,
					'fieldName': fieldName,
					'typeDeclaration': typeDeclaration,
					'camelName': toCamel(fieldName),
					'isList': (typeDeclaration.indexOf('[') != -1)
				});			
			}

			result += getJavaClassDefinition(cls.name, fields);
			result += getDomainClassDefinition(cls.name, fields);
		}

//        alert("DONE. Można?")
		return result;
	}

	return instance;
}




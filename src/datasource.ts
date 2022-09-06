
import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  MutableDataFrame,
  FieldType
} from '@grafana/data';

import { MyQuery, MyDataSourceOptions } from './types';



//================================
// DEFAULT JSON, WILL BE MODIFIED
//================================
var default_json={
	"host": "localhost",
	"oauth": {
		"enable": false,
		"register": "https://localhost:8443/oauth/register",
		"tokenRequest": "https://localhost:8443/oauth/token"
	},
	"sparql11protocol": {
		"protocol": "http",
		"port": 8600,
		"query": {
			"path": "/query",
			"method": "POST",
			"format": "JSON"
		},
		"update": {
			"path": "/update",
			"method": "POST",
			"format": "JSON"
		}
	},
	"sparql11seprotocol": {
		"protocol": "ws",
		"availableProtocols": {
			"ws": {
				"port": 9600,
				"path": "/subscribe"
			},
			"wss": {
				"port": 9443,
				"path": "/secure/subscribe"
			}
		}
	},
	"graphs": {
		
	},
	"namespaces": {
		"schema": "http://schema.org/",
		"rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
		"qudt": "http://qudt.org/schema/qudt#",
		"unit": "http://qudt.org/vocab/unit#",
		"time": "http://www.w3.org/2006/time#"
	},
	"extended": {
		
	},
	"updates": {
		
		"NEW_DATA": {
			"sparql": "INSERT DATA {<ade> <amicizia> <maria>}"
		},

		"ATTENZIONE_DELETE_ALL": {
			"sparql": "DELETE {?s ?p ?o} WHERE {?s ?p ?o}"
		}

	},
	"queries": {

		"TOTAL_QUERY":{
			"sparql": "SELECT * WHERE{ ?s ?p ?o}"
		}, 
		"SINGLE_QUERY":{
			"sparql": "SELECT ?s WHERE {?s <amicizia> ?o }"
		}


	}
}


//==========================
// DEFINE BINDINGS STRUCTURE
//==========================
//CHILD LIVELLO NESTING 1
type Head = {
    vars: string[];
}
//CHILD LIVELLO NESTING 1
type Results = {
	bindings: JSON[];
}
//INTERFACCIA TOTALE
type SparqlBindings = {
    head: Head;
	results: Results;
}


//=====================
// DEFINE SEPA QUERY
//=====================
const SEPA =  require('@arces-wot/sepa-js').SEPA;


function query_sepa(query_text: String | undefined): Promise<string>{
	//CREATE NEW SEPA CLIENT
	let client = new SEPA(default_json);
	
	return new Promise(resolve=>{
		client.query(query_text)
		.then((response: SparqlBindings)=>{ 
			let bindings=extract_bindings(response)
			let resptemp=JSON.stringify(bindings)
			resolve(resptemp)
		})
	});
}

function extract_bindings(msg: SparqlBindings){
	var bindings=msg.results.bindings;
	return bindings;
}



//========================
// NAME: DataSource class
// DESCRIPTION: none
//========================
export class DataSource extends DataSourceApi<MyQuery, MyDataSourceOptions> {
	host: string;
	http_port: number;
	ws_port: number;
	//CLASS CONSTRUCTOR
	constructor(instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>) {
		super(instanceSettings);
	
		this.host= instanceSettings.jsonData.host || "localhost";
		this.http_port = instanceSettings.jsonData.http_port || 8600.0;
		this.ws_port = instanceSettings.jsonData.ws_port || 9600.0;
  	}

  	//GETS CALLED EVERY TIME THE USER MAKES A QUERY
  	async query(options: DataQueryRequest<MyQuery>): Promise<DataQueryResponse> {

		//GET CONFIGURATION
		default_json.host = this.host;
		default_json.sparql11protocol.port = this.http_port;
		default_json.sparql11seprotocol.availableProtocols.ws.port = this.ws_port;
		console.log(default_json.host);
		console.log(default_json.sparql11protocol.port);
		console.log(default_json.sparql11seprotocol.availableProtocols.ws.port);

    	// QUERY
		const promises = options.targets.map((query) =>
			this.doRequest(query).then((response) => {
				var json_response=JSON.parse(response);

				var dynamic_fields=JSON.parse("[]");
				var i=0;
				var single_field={};

				var element_json= json_response[0]; 
				console.log("ELEMENTO JSON"+ element_json);
				Object.keys(element_json).forEach(key => {
					single_field={
							name: key,
							type: FieldType.string,
						}
					console.log("singolo fiels"+ single_field);
					dynamic_fields[i]=single_field;
					i++;
					});	  
					
				
				console.log("tutto fiels"+ dynamic_fields);
				const frame = new MutableDataFrame({
					refId: query.refId,
					/*fields: [
				  		{ name: 's', type: FieldType.string },
				  		{ name: 'p', type: FieldType.string },
				  		{ name: 'o', type: FieldType.string },
					],*/
					fields: dynamic_fields,
				  });
				
				//ADD FRAME DINAMICO
				var jsonData: any = {};
				json_response.forEach((element: any) => {
					Object.keys(element).forEach(key => {
						console.log(key, element[key]);
						jsonData[key]=element[key].value;
						console.log(jsonData);
					  });
					  frame.add(jsonData);
				});
		  		return frame;
			})
		);
		


	// [1] RETURN THE CONSTANT DATA
    return Promise.all(promises).then((data) => ({ data }));

  }




  //ALTRO METODO
  async testDatasource() {
    // Implement a health check for your data source.
    return {
      status: 'success',
      message: 'Success',
    };
  }



	async doRequest(query: MyQuery) {
		console.log("# PREFORMING QUERY #")
		const result= await query_sepa(query.queryText)
		console.log("QUERY RESULT: "+result)
		return result;
	}



}

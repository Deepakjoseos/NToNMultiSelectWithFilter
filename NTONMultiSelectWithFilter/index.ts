import {IInputs, IOutputs} from "./generated/ManifestTypes";
import * as $ from 'jquery';
import { Select2 } from "select2";
import "./scripts/select2.min.js";

declare var Xrm: any;

class DataAction{
	guid : string;
	associate: boolean;
}
class NToNData{
	len : string;
    ida : string;
    na  : string;
    re : string;
    rn : string;
    actions : DataAction[];
}

export class NTONMultiSelectWithFilter implements ComponentFramework.StandardControl<IInputs, IOutputs> {

    private contextObj: ComponentFramework.Context<IInputs>;
    // Div element created as part of this control's main container
	private mainContainer: HTMLSelectElement;
	private errorElement: HTMLDivElement;
	private selectedItems: string[] = [];
	private overlayDiv: HTMLDivElement;
	private container: HTMLDivElement;
	private _isValidState : boolean = true;

	private _relData : NToNData;
    private newFilterId: string;
	private _linkedEntityName: string;
	private _relationshipEntity: string;
	private _relationshipName: string; 
	private _idAttribute: string;
	private _nameAttribute: string;
	private _linkedEntityFetchXmlResource: string;

	private _linkedEntityCollectionName: string;
	private _mainEntityCollectionName: string;
	
	private _entityMetadataSuccessCallback: any;
	private _linkedEntityMetadataSuccessCallback: any;
	private _relationshipSuccessCallback: any;
	private _successCallback : any;

	private _ctrlId : string;

	private _notifyOutputChanged: () => void;


	/**
	 * Empty constructor.
	 */
	constructor()
	{

	}


	public S4() {
		return (((1+Math.random())*0x10000)|0).toString(16).substring(1); 
	}

	public newGuid(){
		var result : string = (this.S4() + this.S4() + "-" + this.S4() + "-4" + this.S4().substr(0,3) + "-" + this.S4() + "-" + this.S4() + this.S4() + this.S4()).toLowerCase();
	return result;
	}
	// then to call it, plus stitch in '4' in the third group
	
	/**
	 * Used to initialize the control instance. Controls can kick off remote server calls and other initialization actions here.
	 * Data-set values are not initialized here, use updateView.
	 * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to property names defined in the manifest, as well as utility functions.
	 * @param notifyOutputChanged A callback method to alert the framework that the control has new outputs ready to be retrieved asynchronously.
	 * @param state A piece of data that persists in one session for a single user. Can be set at any point in a controls life cycle by calling 'setControlState' in the Mode interface.
	 * @param container If a control is marked control-type='standard', it will receive an empty div element within which it can render its content.
	 */
	public init(context: ComponentFramework.Context<IInputs>, notifyOutputChanged: () => void, state: ComponentFramework.Dictionary, container:HTMLDivElement)
	{
		this.container = container;
		this.contextObj = context;
		if(typeof Xrm == 'undefined')
		{
			this.errorElement = document.createElement("div");
			this.errorElement.innerHTML = "<H2>This control only works on model-driven forms!</H2>";
			container.appendChild(this.errorElement);
			this._isValidState = false;
		}
		else{
			
			this._ctrlId = this.newGuid();
			this._relData = new NToNData();
			this._relData.actions = [];
			
			if(context.parameters.linkedEntityName.raw != null){
                this._linkedEntityName = context.parameters.linkedEntityName.raw;
                this._relData.len = this._linkedEntityName;
		}
		if(context.parameters.idAttribute.raw != null){
                this._idAttribute = context.parameters.idAttribute.raw;
                this._relData.ida = this._idAttribute;
		}
		//filtering code logic starts now
		if (context.parameters.lookupFilterName.raw != null) {
			this.newFilterId = context.parameters.lookupFilterName.raw[0].id;
		}		
		//filtering code logic ends now

		if(context.parameters.nameAttribute.raw != null){
                this._nameAttribute = context.parameters.nameAttribute.raw;
                this._relData.na = this._nameAttribute;
		}
		if(context.parameters.relationshipEntity.raw != null){
                this._relationshipEntity = context.parameters.relationshipEntity.raw;
                this._relData.re = this._relationshipEntity;
		}
		if(context.parameters.relationshipName.raw != null){
                this._relationshipName = context.parameters.relationshipName.raw;
                this._relData.rn = this._relationshipName;
		}
		if(context.parameters.linkedEntityFetchXmlResource.raw != null){
            this._linkedEntityFetchXmlResource = context.parameters.linkedEntityFetchXmlResource.raw;
			}	
			context.mode.trackContainerResize(true);
			container.classList.add("pcf_container_element");
			
			this.overlayDiv = document.createElement("div");
			this.overlayDiv.classList.add("pcf_overlay_element");
			container.appendChild(this.overlayDiv);
			
			this.mainContainer = document.createElement("select");
			this.mainContainer.id = this._ctrlId;
			this.mainContainer.classList.add("js-example-basic-multiple");
			this.mainContainer.classList.add("pcf_main_element");
			this.mainContainer.multiple = true;
			this.mainContainer.name = "states[]";
			container.appendChild(this.mainContainer);

			

			this._entityMetadataSuccessCallback = this.entityMetadataSuccessCallback.bind(this);
			this._linkedEntityMetadataSuccessCallback = this.linkedEntityMetadataSuccessCallback.bind(this);
			this._relationshipSuccessCallback = this.relationshipSuccessCallback.bind(this);
			this._successCallback = this.successCallback.bind(this);
			
			this._notifyOutputChanged = notifyOutputChanged;
			
			(<any>Xrm).Utility.getEntityMetadata((<any>this.contextObj).page.entityTypeName,[]).then(this._entityMetadataSuccessCallback, this.errorCallback);
			(<any>Xrm).Utility.getEntityMetadata(this._linkedEntityName,[]).then(this._linkedEntityMetadataSuccessCallback, this.errorCallback);
			//(<any>Xrm).WebApi.retrieveMultipleRecords(this._relationshipEntity, "?$filter="+ (<any>this.contextObj).page.entityTypeName+"id eq " + (<any>this.contextObj).page.entityId, 5000).then(this._relationshipSuccessCallback, this.errorCallback);
			
			if((<any>this.contextObj).page.entityId != null 
                && (<any>this.contextObj).page.entityId != "00000000-0000-0000-0000-000000000000")
			{
				const entityTypeId = (<any>this.contextObj).page.entityTypeName;
				const entityId = (<any>this.contextObj).page.entityId;
                // const additionalFilter = `_ethp_medicalinformationtypeid_value eq c8bfdf11-d034-ee11-bdf4-002248d5dc23`; // Replace with your field and desired value
                const combinedFilter = `$filter=${entityTypeId}id eq ${entityId} `;
                const url = `${this._relationshipEntity}?${combinedFilter}&$top=5000`;
                this.contextObj.webAPI.retrieveMultipleRecords(url).then(this._relationshipSuccessCallback, this.errorCallback);
			}
			else{
				this.relationshipSuccessCallback(null);
			}

			var thisVar : any;
			thisVar = this;
			$(document).ready(function() {
				thisVar.setReadonly();
				$('#'+ thisVar._ctrlId).select2().on('select2:select', function (e) {
					var data = e.params.data;
					thisVar.selectAction("select", data.id);
                    }).on('select2:unselect', function (e) {
					var data = e.params.data;
					thisVar.selectAction("unselect", data.id);
			});
			});
		}
	}

	public entityMetadataSuccessCallback(value: any) : void | PromiseLike<void>
	{
		this._mainEntityCollectionName = value.EntitySetName;
	}
	
	public linkedEntityMetadataSuccessCallback(value: any) : void | PromiseLike<void>
	{
		this._linkedEntityCollectionName = value.EntitySetName;
	}
	
	public addOptions(value: any)
	{
		for(var i in value.entities)
		{
			var current : any = value.entities[i];

			var checked = this.selectedItems.indexOf(<string>current[this._idAttribute]) > -1;
			var newOption = new Option(current[this._nameAttribute], current[this._idAttribute], checked, checked);
            $('#'+ this._ctrlId).append(newOption);
	/*
			var option = document.createElement("option");
		option.value = current[this._idAttribute];
			option.text = current[this._nameAttribute];
			this.mainContainer.options.add(option);
		*/
		}
/*
		var thisVar : any = this;

		setTimeout(function(){ 
			for(var si in thisVar.selectedItems){
				var sel : any = thisVar.selectedItems[si];
				$('#'+ thisVar._ctrlId).val(sel);
			}
		}, 200);
		*/
	}

	public successCallback(value: any) : void | PromiseLike<void>
	{
		this.addOptions(value);
		//this.initTree();
				
	}	


	public relationshipSuccessCallback(value: any) : void | PromiseLike<void>
	{
		if(value != null)
		{
			for(var i in value.entities)
			{
				this.selectedItems.push(value.entities[i][this._idAttribute]);
			}
		}
		if(this._linkedEntityFetchXmlResource != null)
		{
			var _self = this;
			var xhttp = new XMLHttpRequest();
			xhttp.onreadystatechange = function() {
				if (this.readyState == 4 && this.status == 200) {
					

		// Append the filter condition to the fetchXml URL
		const fetchXmlWithFilter = "?fetchXml=" + encodeURIComponent(this.responseText) ;

		// Make the retrieveMultipleRecords request
		_self.contextObj.webAPI.retrieveMultipleRecords(_self._linkedEntityName, fetchXmlWithFilter, 5000).then(_self._successCallback, _self.errorCallback);
		}
			};
		xhttp.open("GET", this._linkedEntityFetchXmlResource, true);
			xhttp.send();
			
		}
		//implemented the filter in the API to retreive data starts from here
		
		// else {
		// 	// let queryOptions = `?$orderby=${this._nameAttribute} asc&$top=5000`;
		// 	//  {
		// 		let queryOptions = `?$orderby=${this._nameAttribute} asc&$top=5000`;
		// 	// }
		// 	this.contextObj.webAPI.retrieveMultipleRecords(this._linkedEntityName, queryOptions).then(this._successCallback, this.errorCallback);
		// }
		//implemented the filter in the API to retreive data ends here
	}
	public errorCallback(value: any)
	{
		alert(value);
	}	

	public setReadonly(): void
	{
		(<HTMLElement>this.container.firstElementChild).style.display = this.contextObj.mode.isControlDisabled == false ? "none" : "block";
	}
	
	/**
	 * Called when any value in the property bag has changed. This includes field values, data-sets, global values such as container height and width, offline status, control metadata values such as label, visible, etc.
	 * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to names defined in the manifest, as well as utility functions
	 */
	public updateView(context: ComponentFramework.Context<IInputs>): void
	{
		if(this._isValidState == false) return;
		// Add code to update control view
		this.contextObj = context;
		this.setReadonly();
		//filtering code logic starts now
		// Check if _newFilter has changed
		if (this.newFilterId != context.parameters.lookupFilterName.raw[0].id) {
			// _newFilter has changed, update it
			this.newFilterId = context.parameters.lookupFilterName.raw[0].id;
		
			// Clear existing data
			$('#'+ this._ctrlId).empty(); // Clear the select2 element
			
			// Log the new newFilterId
			// console.log(`LookupID value changed: ${this.newFilterId}`);
			
			// Construct queryOptions based on the updated filter
			let queryOptions = `?$filter=_ethp_medicalinformationtypeid_value eq ${this.newFilterId}&$orderby=${this._nameAttribute} asc&$top=5000`;
		
			// Retrieve records based on the updated filter
			this.contextObj.webAPI.retrieveMultipleRecords(this._linkedEntityName, queryOptions).then((data) => {
				// Handle the updated records here, e.g., update the UI or data in the PCF control
				this._relData.actions = [];
				this._successCallback(data);
		
				// After handling the records, call relationshipSuccessCallback to further process
				this.relationshipSuccessCallback(null);
			}, this.errorCallback);
		}
		//filtering code logic ends now
	}

	/** 
	 * It is called by the framework prior to a control receiving new data. 
	 * @returns an object based on nomenclature defined in manifest, expecting object[s] for property marked as “bound” or “output”
	 */
	public getOutputs(): IOutputs
	{
		if(this._isValidState == false)
		{
		return {
			value: ""
		};
		}
	else{
		return {
	value: "NTONDATA:"+JSON.stringify(this._relData)
	};
		}
}

/** 
	 * Called when the control is to be removed from the DOM tree. Controls should use this call for cleanup.
	 * i.e. cancelling any pending remote calls, removing listeners, etc.
	 */
	public destroy(): void
	{
		// Add code to cleanup control if necessary
	}

	public selectAction(action : string, id : string)
	{
		/*
		function (e: any, data: any) {
					ProcessClick(
					alert("Checked: " + data.node.id);
					alert("Parent: " + data.node.parent); 
					//alert(JSON.stringify(data));
				}
		*/

		if((<any>this.contextObj).page.entityId == null
		||(<any>this.contextObj).page.entityId == "00000000-0000-0000-0000-000000000000")
		{
			if(action == "select")
			{
				var act = new DataAction();
				act.associate = true;
				act.guid = id;
				this._relData.actions.push(act);
			}
			else{
				for(var i=0; i < this._relData.actions.length; i++)
				{
					const act = this._relData.actions[i];
					if(act.guid == id){
						this._relData.actions.splice(i,1);
						break;
					}
				}
			
			}
			this._notifyOutputChanged();

		}
		else{

			var url: string = (<any>Xrm).Utility.getGlobalContext().getClientUrl();
			var recordUrl: string = url + "/api/data/v9.1/"+ this._mainEntityCollectionName + "(" + (<any>this.contextObj).page.entityId + ")";
			
			if(action == "select")
			{
				

				//See himbap samples here: http://himbap.com/blog/?p=2063
				var associate = {
					"@odata.id": recordUrl
				};
				
				var req = new XMLHttpRequest();
				req.open("POST", url + "/api/data/v9.1/"+ this._linkedEntityCollectionName +"(" + id + ")/" + this._relationshipName + "/$ref", true);
				req.setRequestHeader("Accept", "application/json");
				req.setRequestHeader("Content-Type", "application/json; charset=utf-8");
				req.setRequestHeader("OData-MaxVersion", "4.0");
				req.setRequestHeader("OData-Version", "4.0");
				req.onreadystatechange = function() {
					if (this.readyState == 4 /* complete */ ) {
						req.onreadystatechange = null;
						if (this.status == 204) {
							//alert('Record Associated');
						} else {
							var error = JSON.parse(this.response).error;
							alert(error.message);
						}
					}
				};
				req.send(JSON.stringify(associate));
		
			}
			else if(action == "unselect")
			{

				
				const req = new XMLHttpRequest();
				req.open("DELETE",url + "/api/data/v9.1/"+ this._linkedEntityCollectionName +"(" + id + ")/" + this._relationshipName + "/$ref"+"?$id="+recordUrl, true);
				req.setRequestHeader("Accept", "application/json");
				req.setRequestHeader("Content-Type", "application/json; charset=utf-8");
				req.setRequestHeader("OData-MaxVersion", "4.0");
				req.setRequestHeader("OData-Version", "4.0");
				req.onreadystatechange = function() {
					if (this.readyState == 4 /* complete */ ) {
						req.onreadystatechange = null;
						if (this.status == 204) {
							//alert('Record Disassociated');
						} else {
							var error = JSON.parse(this.response).error;
							alert(error.message);
						}
					}
				};
				req.send();
			}
		}
		
	}

}
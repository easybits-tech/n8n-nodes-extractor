import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionTypes,
	NodeOperationError,
} from 'n8n-workflow';

const ALLOWED_BINARY_MIME_TYPES = new Set([
	'image/jpeg',
	'image/jpg',
	'image/png',
	'application/pdf',
]);

const ALLOWED_EXTENSIONS_LABEL = 'JPEG, PNG, or PDF';

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
	let current: unknown = obj;
	for (const key of path.split('.')) {
		if (current === null || current === undefined || typeof current !== 'object') {
			return undefined;
		}
		current = (current as Record<string, unknown>)[key];
	}
	return current;
}

export class EasybitsExtractor implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'easybits Extractor',
		name: 'easybitsExtractor',
		icon: 'file:easybitsExtractorLogo.svg',
		group: ['transform'],
		usableAsTool: true,
		version: 1,
		subtitle:
			'={{$parameter["inputType"] === "binaryFiles" ? "Binary Files" : $parameter["inputType"] === "dataUrls" ? "Data URLs" : "Auto"}}',
		description:
			'Sends files to the easybits Extractor API for data extraction. Supports binary file attachments and base64 Data URLs as input.',
		defaults: {
			name: 'easybits Extractor',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'easybitsExtractorApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Input Type',
				name: 'inputType',
				type: 'options',
				default: 'binaryFiles',
				options: [
					{
						name: 'Binary Files',
						value: 'binaryFiles',
						description: 'Use binary file attachments from input items',
					},
					{
						name: 'Data URLs',
						value: 'dataUrls',
						description: 'Use pre-encoded base64 Data URLs from item JSON fields',
					},
					{
						name: 'Auto (Both)',
						value: 'auto',
						description:
							'Collect both binary file attachments and Data URLs from item JSON fields',
					},
				],
				description:
					'How to provide files to the Extractor API. "Binary Files" reads binary attachments, "Data URLs" reads base64 Data URLs from a JSON field, "Auto" collects both.',
			},
			{
				displayName: 'Data URL Field',
				name: 'dataUrlField',
				type: 'string',
				default: 'dataUrl',
				displayOptions: {
					show: {
						inputType: ['dataUrls', 'auto'],
					},
				},
				description: 'The name of the JSON field containing the Data URL(s). Supports dot notation for nested fields (e.g. "attachments.0.URL"). The field value can be a single Data URL string or an array of Data URL strings.',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const dataUrls: string[] = [];
		const inputType = this.getNodeParameter('inputType', 0) as string;
		const collectBinaries = inputType === 'binaryFiles' || inputType === 'auto';
		const collectDataUrls = inputType === 'dataUrls' || inputType === 'auto';

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const item = items[itemIndex];

				if (collectBinaries && item.binary) {
					for (const binaryPropertyName of Object.keys(item.binary)) {
						const binaryData = item.binary[binaryPropertyName];

						if (!ALLOWED_BINARY_MIME_TYPES.has(binaryData.mimeType)) {
							throw new NodeOperationError(
								this.getNode(),
								`Unsupported file type "${binaryData.mimeType}" for binary property "${binaryPropertyName}". Only ${ALLOWED_EXTENSIONS_LABEL} files are allowed.`,
								{ itemIndex },
							);
						}

						const buffer = await this.helpers.getBinaryDataBuffer(
							itemIndex,
							binaryPropertyName,
						);
						const base64 = buffer.toString('base64');
						dataUrls.push(`data:${binaryData.mimeType};base64,${base64}`);
					}
				}

				if (collectDataUrls) {
					const dataUrlField = this.getNodeParameter('dataUrlField', itemIndex) as string;
					const rawValue = getNestedValue(item.json, dataUrlField);

					if (rawValue !== undefined && rawValue !== null) {
						const values = Array.isArray(rawValue) ? rawValue : [rawValue];

						for (const value of values) {
							if (typeof value !== 'string' || !value.startsWith('data:')) {
								throw new NodeOperationError(
									this.getNode(),
									`Invalid Data URL in field "${dataUrlField}". Expected a string starting with "data:", got ${typeof value === 'string' ? `"${value.substring(0, 50)}..."` : typeof value}.`,
									{ itemIndex },
								);
							}
							dataUrls.push(value);
						}
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					continue;
				}
				if (error instanceof NodeOperationError) {
					throw error;
				}
				throw new NodeOperationError(this.getNode(), error as Error, {
					itemIndex,
				});
			}
		}

		const credentials = await this.getCredentials('easybitsExtractorApi');
		const pipelineId = credentials.pipelineId as string;
		const apiKey = credentials.apiKey as string;

		const responseData = await this.helpers.httpRequest({
			method: 'POST',
			url: `https://extractor.easybits.tech/api/pipelines/${pipelineId}`,
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
			body: { files: dataUrls },
		});

		return [[{ json: responseData, pairedItem: { item: 0 } }]];
	}
}

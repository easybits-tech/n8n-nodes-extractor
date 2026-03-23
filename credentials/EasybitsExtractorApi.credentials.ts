import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class EasybitsExtractorApi implements ICredentialType {
	name = 'easybitsExtractorApi';
	displayName = 'Easybits Extractor API';
	icon = 'file:easybitsExtractorLogo.svg' as const;
	documentationUrl = 'https://extractor.easybits.tech/documentation';
	properties: INodeProperties[] = [
		{
			displayName: 'Pipeline ID',
			name: 'pipelineId',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'e.g. abc123',
			description: 'The pipeline ID from your Easybits Extractor dashboard',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'API key from your Easybits Extractor dashboard',
		},
	];
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://extractor.easybits.tech',
			url: '=/api/pipelines/{{$credentials.pipelineId}}/test',
			method: 'GET',
		},
	};
}

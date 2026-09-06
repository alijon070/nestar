import { Injectable } from '@nestjs/common';

@Injectable()
export class BatchService {
	getHello(): string {
		return 'Welcome to Nestar BATCH Server!';
	}

	public async batchRollback(): Promise<void> {
		console.log('batchRollback');
	}
	public async branchProperties(): Promise<void> {
		console.log('branchProperties');
	}

	public async batchAgents(): Promise<void> {
		console.log('batchAgents');
	}
}

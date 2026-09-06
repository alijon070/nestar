import { Controller, Get, Logger } from '@nestjs/common';
import { BatchService } from './batch.service';
import { Cron, Interval, Timeout } from '@nestjs/schedule';

@Controller()
export class BatchController {
	private logger: Logger = new Logger('BatchController');
	constructor(private readonly batchService: BatchService) {}
	/*
	@Interval(1000)
	handleInterval() {
		this.logger.debug('INTERVAL TEST');
	}
	*/

	@Timeout(1000)
	handleTimeout() {
		this.logger.debug('BATCH SERVER READY!');
	}

	@Cron('00 * * * * *', { name: 'BATCH_ROLLBACK' })
	public async batchRollback() {
		try {
			this.logger['context'] = 'BATCH_ROLLBACK';
			this.logger.debug('EXECUTED');
			await this.batchService.batchRollback();
		} catch (err) {
			this.logger.error(err);
		}
	}

	@Cron('20 * * * * *', { name: 'BATCH_TOP_PROPERTIES' })
	public branchProperties() {
		try {
			this.logger['context'] = 'BATCH_TOP_PROPERTIES';
			this.logger.debug('EXECUTED');
		} catch (err) {
			this.logger.error(err);
		}
	}

	@Cron('40 * * * * *', { name: 'BATCH_TOP_AGENTS' })
	public batchAgents() {
		try {
			this.logger['context'] = 'BATCH_TOP_AGENTS';
			this.logger.debug('EXECUTED');
		} catch (err) {
			this.logger.error(err);
		}
	}
	@Get()
	getHello(): string {
		return this.batchService.getHello();
	}
}

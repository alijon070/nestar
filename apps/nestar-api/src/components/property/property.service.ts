import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AuthService } from '../auth/auth.service';
import { ViewService } from '../view/view.service';
import { Model } from 'mongoose';

@Injectable()
export class PropertyService {
	constructor(
		@InjectModel('Property') private readonly memberModel: Model<null>,
		private authservice: AuthService,
		private viewservice: ViewService,
	) {}
}

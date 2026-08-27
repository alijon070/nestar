import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AuthService } from '../auth/auth.service';
import { ViewService } from '../view/view.service';
import { Model } from 'mongoose';
import { Property } from '../../libs/dto/property/property';
import { PropertyInput } from '../../libs/dto/property/property.input';
import { Message } from '../../libs/enums/common.enum';
import { MemberService } from '../member/member.service';

@Injectable()
export class PropertyService {
	constructor(
		@InjectModel('Property') private readonly propertyModel: Model<Property>,
		private readonly memberService: MemberService,
		private authservice: AuthService,
		private viewservice: ViewService,
	) {}

	public async createProperty(input: PropertyInput): Promise<Property> {
		try {
			if (!input.memberId) throw new Error(Message.NO_MEMBER_NICK);

			const result = await this.propertyModel.create(input);

			await this.memberService.memberStatusEditor({ _id: input.memberId, targetKey: 'memberProperties', modifier: 1 });

			return result;
		} catch (err) {
			console.log('Error, Signup:', (err as Error).message);
			throw new BadRequestException(Message.USED_NICK_PHONE);
		}
	}
}

import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Member } from '../../libs/dto/member/member';
import { MemberInput } from '../../libs/dto/member/member.input';

@Injectable()
export class MemberService {
	constructor(@InjectModel('Member') private readonly memberModel: Model<Member>) {}

	public async signup(input: MemberInput): Promise<Member> {
		try {
			const result = await this.memberModel.create(input);
			return result;
		} catch (err) {
			console.log('Error, Signup:', err);
			throw new BadRequestException(err);
		}
	}

	public async login(): Promise<String> {
		return 'login executed';
	}

	public async updateMember(): Promise<String> {
		return 'updateMember executed';
	}

	public async getMember(): Promise<String> {
		return 'getMember executed';
	}
}

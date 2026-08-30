import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AuthService } from '../auth/auth.service';
import { ViewService } from '../view/view.service';
import { Model, ObjectId } from 'mongoose';
import { Properties, Property } from '../../libs/dto/property/property';
import {
	AgentPropertiesInquiry,
	AllPropertiesInquiry,
	PropertiesInquiry,
	PropertyInput,
} from '../../libs/dto/property/property.input';
import { Direction, Message } from '../../libs/enums/common.enum';
import { MemberService } from '../member/member.service';
import { StatisticsModifier, T } from '../../libs/types/common';
import { PropertyStatus } from '../../libs/enums/property.enum';
import { ViewGroup } from '../../libs/enums/view.enum';
import { PropertyUpdate } from '../../libs/dto/property/property.update';
import moment from 'moment';
import { lookupMember, shapeIntoMongoObjectId } from '../../libs/types/config';

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
			console.log('Error, createProperty:', (err as Error).message);
			throw new BadRequestException(Message.CREATE_FAILED);
		}
	}

	public async getProperty(propertyId: ObjectId, memberId: ObjectId): Promise<Property> {
		try {
			const search: T = {
				_id: propertyId,
				propertyStatus: PropertyStatus.ACTIVE,
			};

			const targetProperty = await this.propertyModel.findOne(search).lean().exec();
			if (!targetProperty) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

			const result = targetProperty as unknown as Property;

			if (memberId) {
				const viewInput = { memberId: memberId, viewRefId: propertyId, viewGroup: ViewGroup.PROPERTY };
				const newView = await this.viewservice.recordView(viewInput);
				if (newView) {
					await this.propertyStatusEditor({ _id: propertyId, targetKey: 'propertyViews', modifier: 1 });
					result.propertyViews++;
				}
			}

			result.memberData = await this.memberService.getMember(null, targetProperty.memberId);

			return result;
		} catch (err) {
			console.log('Error, getProperty:', (err as Error).message);
			throw new BadRequestException(Message.NO_DATA_FOUND);
		}
	}

	public async updateProperty(memberId: ObjectId, input: PropertyUpdate): Promise<Property> {
		let { propertyStatus, soldAt, deleteAt } = input;
		const search: T = { _id: input._id, memberId: memberId, propertyStatus: PropertyStatus.ACTIVE };

		if (propertyStatus === PropertyStatus.SOLD) soldAt = moment().toDate();
		else if (propertyStatus === PropertyStatus.DELETE) deleteAt = moment().toDate();
		const result = await this.propertyModel
			.findOneAndUpdate(
				search,

				input,
				{ new: true },
			)
			.exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

		if (soldAt || deleteAt) {
			await this.memberService.memberStatusEditor({
				_id: memberId,
				targetKey: 'memberProperties',
				modifier: -1,
			});
		}

		return result;
	}

	public async getProperties(memberId: ObjectId, input: PropertiesInquiry): Promise<Properties> {
		const match: T = { propertyStatus: PropertyStatus.ACTIVE };
		const sort: T = { [input?.sort ?? 'ceatedAt']: input?.direction ?? Direction.DESC };

		this.shapeMatchQuery(match, input);
		console.log('match:', match);

		const result = await this.propertyModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [
							{ $skip: (input.page - 1) * input.limit },
							{ $limit: input.limit },
							//meliked
							lookupMember,
							{ $unwind: '$memberData' },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();
		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		return result[0];
	}

	private shapeMatchQuery(match: T, input: PropertiesInquiry): void {
		const {
			memberId,
			locationList,
			roomsList,
			bedsList,
			typeList,
			periodsRange,
			pricesRange,
			squaresRange,
			options,
			text,
		} = input.search;

		if (memberId) match.memberId = shapeIntoMongoObjectId(memberId);
		if (locationList) match.propertyLocation = { $in: locationList };
		if (roomsList) match.propertyRooms = { $in: roomsList };
		if (bedsList) match.propertyBeds = { $in: bedsList };
		if (typeList) match.propertyType = { $in: typeList };

		if (periodsRange) match.createdAt = { $gte: periodsRange.start, $lte: periodsRange.end };
		if (pricesRange) match.propertyPrice = { $gte: pricesRange.start, $lte: pricesRange.end };
		if (squaresRange) match.propertySquare = { $gte: squaresRange.start, $lte: squaresRange.end };

		if (text) match.propertyTitle = { $regex: new RegExp(text, 'i') };
		if (options) {
			match['$or'] = options.map((ele) => {
				return { [ele]: true };
			});
		}
	}

	public async getAgentProperties(memberId: ObjectId, input: AgentPropertiesInquiry): Promise<Properties> {
		const { propertyStatus } = input.search;
		if (propertyStatus === PropertyStatus.DELETE) throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);

		const match: T = { memberId: memberId, propertyStatus: propertyStatus ?? { $ne: PropertyStatus.DELETE } };
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		const result = await this.propertyModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [
							{ $skip: (input.page - 1) * input.limit },
							{ $limit: input.limit },
							lookupMember,
							{ $unwind: '$memberData' },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		if (!result) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		return result[0];
	}

	public async propertyStatusEditor(input: StatisticsModifier): Promise<Property> {
		const { _id, targetKey, modifier } = input;

		const result = await this.propertyModel
			.findByIdAndUpdate(_id, { $inc: { [targetKey]: modifier } }, { new: true })
			.exec();
		if (!result) throw new Error(Message.NO_DATA_FOUND);

		return result;
	}

	/** ADMIN **/

	public async getAllPropertiesByAdmin(input: AllPropertiesInquiry): Promise<Properties> {
		const { propertyStatus, propertyLocationList } = input.search;
		const match: T = {};
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		if (propertyStatus) match.propertyStatus = propertyStatus;
		if (propertyLocationList) match.propertyLocation = { $in: propertyLocationList };

		const result = await this.propertyModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [
							{ $skip: (input.page - 1) * input.limit },
							{ $limit: input.limit },
							lookupMember,
							{ $unwind: '$memberData' },
						],

						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		return result[0];
	}

	public async updatePropertyByAdmin(input: PropertyUpdate): Promise<Property> {
		let { propertyStatus, soldAt, deleteAt } = input;
		const search: T = { _id: input._id, propertyStatus: PropertyStatus.ACTIVE };

		if (propertyStatus === PropertyStatus.SOLD) soldAt = moment().toDate();
		else if (propertyStatus === PropertyStatus.DELETE) deleteAt = moment().toDate();
		const result = await this.propertyModel.findOneAndUpdate(search, input, { new: true }).exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

		if (soldAt || deleteAt) {
			await this.memberService.memberStatusEditor({
				_id: result.memberId,
				targetKey: 'memberProperties',
				modifier: -1,
			});
		}

		return result;
	}

	public async removePropertyByAdmin(propertyId: ObjectId): Promise<Property> {
		const search: T = { _id: propertyId, propertyStatus: PropertyStatus.DELETE },
			result = await this.propertyModel.findOneAndDelete(search).exec();
		if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);

		return result;
	}
}

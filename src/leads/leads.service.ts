import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from './leads.entity';

@Injectable()
export class LeadsService {
    constructor(
        @InjectRepository(Lead)
        private readonly leadsRepository: Repository<Lead>,
    ) {}

    async create(data: Partial<Lead>): Promise<Lead> {
        const lead = this.leadsRepository.create(data);
        return this.leadsRepository.save(lead);
    }
}

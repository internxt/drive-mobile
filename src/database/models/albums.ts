import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Albums {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ nullable: false })
    userId: string;
}
export class MeetingService {
  async findAllByOrganization(orgId: string, page: number, limit: number, status?: string) { return []; }
  async createMeeting(orgId: string, userId: string, data: any) { return { id: 'mock-meeting-id' }; }
  async getMeetingDetails(meetingId: string, orgId: string) { return {}; }
  async updateMeeting(meetingId: string, orgId: string, data: any) { return {}; }
  async generateExport(meetingId: string, orgId: string, format: string) { return { url: 'mock-url' }; }
}
